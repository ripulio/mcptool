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

function isPlainObjectType(
  type: ts.Type,
  typeChecker: ts.TypeChecker
): boolean {
  if (
    type.flags &
    (ts.TypeFlags.String |
      ts.TypeFlags.Number |
      ts.TypeFlags.Boolean |
      ts.TypeFlags.Null |
      ts.TypeFlags.Undefined |
      ts.TypeFlags.Void |
      ts.TypeFlags.StringLiteral |
      ts.TypeFlags.NumberLiteral |
      ts.TypeFlags.BooleanLiteral)
  ) {
    return true;
  }

  if (typeChecker.isArrayType(type)) {
    const typeArgs = (type as ts.TypeReference).typeArguments;
    if (typeArgs && typeArgs.length > 0) {
      return isPlainObjectType(typeArgs[0]!, typeChecker);
    }
    return true;
  }

  const symbol = type.getSymbol();
  if (symbol) {
    const name = symbol.getName();
    if (name === 'Map' || name === 'Set') {
      const typeArgs = (type as ts.TypeReference).typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        return typeArgs.every((arg) => isPlainObjectType(arg, typeChecker));
      }
      return true;
    }
  }

  if (type.isUnion()) {
    return type.types.every((t) => isPlainObjectType(t, typeChecker));
  }

  if (type.isIntersection()) {
    return type.types.every((t) => isPlainObjectType(t, typeChecker));
  }

  if (type.flags & ts.TypeFlags.Object) {
    const objectType = type as ts.ObjectType;

    return (objectType.objectFlags & ts.ObjectFlags.Class) === 0;
  }

  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return true;
  }

  return false;
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

function visit(
  node: ts.Node,
  context: ProjectContext,
  typeChecker: ts.TypeChecker
) {
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
        const paramName = ts.isIdentifier(param.name) ? param.name.text : '';
        const paramType = typeChecker.getTypeAtLocation(param);
        const isOptional =
          param.questionToken !== undefined || param.initializer !== undefined;

        if (!isPlainObjectType(paramType, typeChecker)) {
          throw new Error(
            `Parameter "${paramName}" in function "${functionName}" has an unsupported type. ` +
              `Only plain objects, primitives, and arrays are allowed. ` +
              `Complex types like class instances, Date, Map, Set, etc. are not supported.`
          );
        }

        return {
          name: paramName,
          type: paramType,
          optional: isOptional
        };
      })
      .filter((p) => p.name !== '');

    const tool: SourceToolInfo = {
      name: functionName,
      parameters
    };
    if (description) {
      tool.description = description;
    }
    context.tools.push(tool);
  }

  ts.forEachChild(node, (node) => visit(node, context, typeChecker));
}

function generateCodeFromSourceFile(
  sourceFile: ts.SourceFile,
  context: ProjectContext,
  typeChecker: ts.TypeChecker
): string {
  visit(sourceFile, context, typeChecker);

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

  const typeChecker = program.getTypeChecker();
  const baseName = path.basename(filePath, path.extname(filePath));
  const outputFileName = `${baseName}.generated${outExtension}`;
  const outputPath = path.join(outDir, outputFileName);
  const context: ProjectContext = {
    name: 'Generated MCP Server',
    version: '1.0.0',
    tools: [],
    sourceFilePath: resolvedFilePath,
    outputFilePath: outputPath,
    typeChecker
  };

  const generatedCode = generateCodeFromSourceFile(
    sourceFile,
    context,
    typeChecker
  );

  await writeFile(outputPath, generatedCode, 'utf-8');
}
