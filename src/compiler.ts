import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import ts from 'typescript';
import type {
  ProjectContext,
  CompilerOptions,
  ProjectDependency
} from './shared.js';
import {visitMCPExports} from './ast.js';
import {template as tmcpTemplate} from './flavours/tmcp.js';
import {template as mcpTemplate} from './flavours/mcp.js';
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
    case 'mcp':
      return mcpTemplate(context);
    default:
      return tmcpTemplate(context);
  }
}

export interface CompileResultSuccess {
  success: true;
  dependencies: ProjectDependency[];
}

export interface CompileResultFailure {
  success: false;
}

export type CompileResult = CompileResultSuccess | CompileResultFailure;

function computeDependenciesForFlavor(
  context: ProjectContext
): ProjectDependency[] {
  const dependencies: ProjectDependency[] = [];

  switch (context.flavor) {
    case 'tmcp': {
      dependencies.push(
        {type: 'prod', name: 'tmcp', version: '^1.15.5'},
        {type: 'prod', name: '@tmcp/adapter-zod', version: '^0.1.6'},
        {type: 'prod', name: 'zod', version: '^4.1.12'}
      );
      if (context.transport === 'http') {
        dependencies.push({
          type: 'prod',
          name: '@tmcp/transport-http',
          version: '^0.7.1'
        });
      } else if (context.transport === 'stdio') {
        dependencies.push({
          type: 'prod',
          name: '@tmcp/transport-stdio',
          version: '^0.3.1'
        });
      }
      break;
    }
    case 'mcp': {
      dependencies.push(
        {type: 'prod', name: '@modelcontextprotocol/sdk', version: '^1.20.2'},
        {type: 'prod', name: 'zod', version: '^4.1.12'}
      );
      break;
    }
  }

  return dependencies;
}

export async function compile(
  filePath: string,
  options?: CompilerOptions
): Promise<CompileResult> {
  const cwd = options?.cwd ?? process.cwd();
  const silent = options?.silent === true;
  const logger = getLogger(silent);
  const outDir = path.resolve(cwd, options?.outDir || '.');
  const outExtension = options?.outExtension || '.ts';
  let compilerOptions: ts.CompilerOptions;
  try {
    compilerOptions = tryReadConfigFile(cwd);
  } catch (err) {
    logger.warn(
      `Warning: Could not read tsconfig.json in "${cwd}". Using default compiler options.`
    );
    compilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true
    };
  }
  const resolvedFilePath = path.resolve(cwd, filePath);

  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram([resolvedFilePath], compilerOptions, host);
  const sourceFile = program.getSourceFile(resolvedFilePath);

  if (!sourceFile) {
    logger.error(`Could not read source file: ${resolvedFilePath}`);
    return {success: false};
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
    flavor: options?.flavor ?? 'tmcp',
    logger
  };

  const generatedCode = generateCodeFromSourceFile(
    sourceFile,
    context,
    typeChecker
  );

  await writeFile(outputPath, generatedCode, 'utf-8');

  await tryFormatFile(outputPath, cwd);

  return {
    success: true,
    dependencies: computeDependenciesForFlavor(context)
  };
}
