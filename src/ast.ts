import ts from 'typescript';
import type {ProjectContext, SourceToolInfo} from './shared.js';
import {InvalidParameterError} from './error.js';

export function isPlainObjectType(
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

export function visitMCPExports(
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
          throw new InvalidParameterError(
            functionName,
            paramName,
            node.getSourceFile(),
            param
          );
        }

        return {
          name: paramName,
          type: paramType,
          optional: isOptional
        };
      })
      .filter((p) => p.name !== '');

    const signature = typeChecker.getSignatureFromDeclaration(node);

    if (!signature) {
      return;
    }

    const returnType = signature.getReturnType();
    const tool: SourceToolInfo = {
      name: functionName,
      parameters,
      returnType
    };
    if (description) {
      tool.description = description;
    }
    context.tools.push(tool);
  }

  ts.forEachChild(node, (node) => visitMCPExports(node, context, typeChecker));
}
