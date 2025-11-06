import ts from 'typescript';
import type {SourceToolInfo} from './shared.js';

export function generateTypeSchema(
  type: ts.Type,
  checker: ts.TypeChecker
): string {
  // Handle literal types first (before broader primitive types)
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    const typeString = checker.typeToString(type);
    const value = typeString === 'true';
    return `z.literal(${value})`;
  }

  if (type.flags & ts.TypeFlags.StringLiteral) {
    const value = (type as ts.StringLiteralType).value;
    return `z.literal(${JSON.stringify(value)})`;
  }

  if (type.flags & ts.TypeFlags.NumberLiteral) {
    const value = (type as ts.NumberLiteralType).value;
    return `z.literal(${value})`;
  }

  // Handle broader primitive types
  if (type.flags & ts.TypeFlags.Boolean) {
    return 'z.boolean()';
  }

  if (type.isUnion()) {
    const types = type.types.map((t) => generateTypeSchema(t, checker));
    return `z.union([${types.join(', ')}])`;
  }

  if (checker.isTupleType(type)) {
    const typeRef = type as ts.TypeReference;
    const target = typeRef.target as ts.TupleType;
    const typeArgs = typeRef.typeArguments || [];
    const hasRest = (target.combinedFlags & ts.ElementFlags.Variable) !== 0;

    if (hasRest && typeArgs.length > 0) {
      const restIndex = typeArgs.length - 1;
      const fixedElements = typeArgs
        .slice(0, restIndex)
        .map((t) => generateTypeSchema(t, checker));
      const restElement = typeArgs[restIndex]!;

      let restSchema = 'z.any()';
      if (checker.isArrayType(restElement)) {
        const objectType = restElement as ts.ObjectType;
        if (objectType.objectFlags & ts.ObjectFlags.Reference) {
          const restTypeRef = objectType as ts.TypeReference;
          const restTypeArgs = restTypeRef.typeArguments;
          if (restTypeArgs && restTypeArgs.length > 0) {
            restSchema = generateTypeSchema(restTypeArgs[0]!, checker);
          }
        }
      } else {
        restSchema = generateTypeSchema(restElement, checker);
      }

      return `z.tuple([${fixedElements.join(', ')}], ${restSchema})`;
    } else {
      const elements = typeArgs.map((t) => generateTypeSchema(t, checker));
      return `z.tuple([${elements.join(', ')}])`;
    }
  }

  if (checker.isArrayType(type)) {
    const objectType = type as ts.ObjectType;
    if (objectType.objectFlags & ts.ObjectFlags.Reference) {
      const typeRef = objectType as ts.TypeReference;
      const typeArgs = typeRef.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        return `z.array(${generateTypeSchema(typeArgs[0]!, checker)})`;
      }
    }
    return 'z.array(z.any())';
  }

  if (type.flags & ts.TypeFlags.Object) {
    const objectType = type as ts.ObjectType;
    if (objectType.objectFlags & ts.ObjectFlags.Reference) {
      const typeRef = objectType as ts.TypeReference;
      const symbol = typeRef.symbol;

      if (symbol && symbol.name === 'Set') {
        const typeArgs = typeRef.typeArguments;
        if (typeArgs && typeArgs.length > 0) {
          return `z.set(${generateTypeSchema(typeArgs[0]!, checker)})`;
        }
        return 'z.set(z.any())';
      }

      if (symbol && symbol.name === 'Map') {
        const typeArgs = typeRef.typeArguments;
        if (typeArgs && typeArgs.length === 2) {
          const keySchema = generateTypeSchema(typeArgs[0]!, checker);
          const valueSchema = generateTypeSchema(typeArgs[1]!, checker);
          return `z.map(${keySchema}, ${valueSchema})`;
        }
        return 'z.map(z.any(), z.any())';
      }
    }
  }

  if (type.isClassOrInterface() || type.flags & ts.TypeFlags.Object) {
    const properties = type.getProperties();
    if (properties && properties.length > 0) {
      const props = properties
        .map((prop) => {
          const propType = checker.getTypeOfSymbolAtLocation(
            prop,
            prop.valueDeclaration!
          );
          const isOptional = prop.flags & ts.SymbolFlags.Optional;
          const schema = propType
            ? generateTypeSchema(propType, checker)
            : 'z.any()';
          return `${prop.name}: ${isOptional ? `z.optional(${schema})` : schema}`;
        })
        .join(',\n  ');
      return `z.object({
  ${props}
})`;
    }
  }

  if (type.flags & ts.TypeFlags.String) {
    return 'z.string()';
  }

  if (type.flags & ts.TypeFlags.Number) {
    return 'z.number()';
  }

  if (type.flags & ts.TypeFlags.Null) {
    return 'z.null()';
  }

  if (type.flags & ts.TypeFlags.Undefined) {
    return 'z.undefined()';
  }

  if (type.flags & ts.TypeFlags.Any) {
    return 'z.any()';
  }

  if (type.flags & ts.TypeFlags.Unknown) {
    return 'z.unknown()';
  }

  return 'z.any()';
}

export function generateSchemaForTool(
  tool: SourceToolInfo,
  checker: ts.TypeChecker
): string {
  const params = tool.parameters
    .map((param) => {
      const schema = generateTypeSchema(param.type, checker);
      const wrappedSchema = param.optional ? `z.optional(${schema})` : schema;
      return `${param.name}: ${wrappedSchema}`;
    })
    .join(',\n      ');

  return `z.object({
      ${params}
    })`;
}
