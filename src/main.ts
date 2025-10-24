import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type {ProjectContext, SourceToolInfo} from './shared.js';
import {template} from './flavours/tmcp.js';

export interface CompilerOptions {
  outDir?: string;
  outExtension?: string;
  cwd?: string;
}

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

function visit(node: ts.Node, context: ProjectContext) {
  const hasExportModifier =
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  if (hasExportModifier && ts.isFunctionDeclaration(node) && node.name) {
    const functionName = node.name.text;

    let description: string | undefined;

    const jsDocComments = ts.getJSDocCommentsAndTags(node);
    const firstComment = jsDocComments[0];

    if (!firstComment || !ts.isJSDoc(firstComment)) {
      return;
    }

    const hasMcpToolTag = firstComment.tags?.some(
      (tag) => ts.isJSDocUnknownTag(tag) && tag.tagName.text === 'mcpTool'
    );

    if (!hasMcpToolTag) {
      return;
    }

    if (typeof firstComment.comment === 'string') {
      description = firstComment.comment;
    }

    const parameters = node.parameters
      .map((param) => {
        if (ts.isIdentifier(param.name)) {
          return param.name.text;
        }
        return '';
      })
      .filter(Boolean);

    const tool: SourceToolInfo = {
      name: functionName,
      parameters: parameters.map((p) => ({
        name: p,
        type: {} as ts.Type
      }))
    };
    if (description) {
      tool.description = description;
    }
    context.tools.push(tool);
  }

  ts.forEachChild(node, (node) => visit(node, context));
}

function generateCodeFromSourceFile(
  sourceFile: ts.SourceFile,
  context: ProjectContext
): string {
  visit(sourceFile, context);

  return template(context);
}

export async function compile(
  filePath: string,
  options?: CompilerOptions
): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options?.outDir || '.');
  const outExtension = options?.outExtension || '.ts';
  const compilerOptions = tryReadConfigFile(cwd);
  const resolvedFilePath = path.resolve(cwd, filePath);

  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram([resolvedFilePath], compilerOptions, host);
  const sourceFile = program.getSourceFile(resolvedFilePath);

  if (!sourceFile) {
    throw new Error(`Could not read source file: ${resolvedFilePath}`);
  }

  const baseName = path.basename(filePath, path.extname(filePath));
  const outputFileName = `${baseName}.generated${outExtension}`;
  const outputPath = path.join(outDir, outputFileName);
  const context: ProjectContext = {
    name: 'Generated MCP Server',
    version: '1.0.0',
    tools: [],
    sourceFilePath: resolvedFilePath,
    outputFilePath: outputPath
  };

  const generatedCode = generateCodeFromSourceFile(sourceFile, context);

  await writeFile(outputPath, generatedCode, 'utf-8');
}
