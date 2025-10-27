import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import ts from 'typescript';
import type {ProjectContext, CompilerOptions} from './shared.js';
import {visitMCPExports} from './ast.js';
import {template as tmcpTemplate} from './flavours/tmcp.js';
import {installDependencies} from './install-dependencies.js';
import {tryFormatFile} from './format.js';
import {getLogger} from './logger.js';

function tryReadConfigFile(cwd: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');

  if (!configPath) {
    throw new Error('tsconfig.json not found');
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(
      configFile.error.messageText,
      '\n'
    );
    throw new Error(`Error reading tsconfig.json: ${message}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );

  return parsedConfig.options;
}

function generateCodeFromSourceFile(
  sourceFile: ts.SourceFile,
  context: ProjectContext,
  typeChecker: ts.TypeChecker
): string {
  visitMCPExports(sourceFile, context, typeChecker);

  switch (context.flavor) {
    default:
      return tmcpTemplate(context);
  }
}

export async function compile(
  filePath: string,
  options?: CompilerOptions
): Promise<boolean> {
  const cwd = options?.cwd ?? process.cwd();
  const silent = options?.silent === true;
  const logger = getLogger(silent);
  const outDir = path.resolve(cwd, options?.outDir || '.');
  const outExtension = options?.outExtension || '.ts';
  const compilerOptions = tryReadConfigFile(cwd);
  const resolvedFilePath = path.resolve(cwd, filePath);

  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram([resolvedFilePath], compilerOptions, host);
  const sourceFile = program.getSourceFile(resolvedFilePath);

  if (!sourceFile) {
    logger.error(`Could not read source file: ${resolvedFilePath}`);
    return false;
  }

  const typeChecker = program.getTypeChecker();
  const baseName = path.basename(filePath, path.extname(filePath));
  const outputFileName = `${baseName}.generated${outExtension}`;
  const outputPath = path.join(outDir, outputFileName);
  const context: ProjectContext = {
    name: options?.name ?? 'Generated MCP Server',
    version: options?.version ?? '1.0.0',
    tools: [],
    transport: options?.transport ?? 'stdio',
    sourceFilePath: resolvedFilePath,
    outputFilePath: outputPath,
    typeChecker,
    dependencies: [],
    flavor: options?.flavor ?? 'tmcp',
    logger
  };

  const generatedCode = generateCodeFromSourceFile(
    sourceFile,
    context,
    typeChecker
  );

  await writeFile(outputPath, generatedCode, 'utf-8');

  await installDependencies(context);

  await tryFormatFile(outputPath, cwd);

  return true;
}
