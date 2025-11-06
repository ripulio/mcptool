import ts from 'typescript';

export function createProgram(sourceCode: string): ts.Program {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    strict: true
  };

  const host = ts.createCompilerHost(compilerOptions, true);
  const originalGetSourceFile = host.getSourceFile;

  host.getSourceFile = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  ) => {
    if (fileName === 'test.ts') {
      return sourceFile;
    }
    return originalGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    );
  };

  return ts.createProgram(['test.ts'], compilerOptions, host);
}

export function getReturnType(
  program: ts.Program,
  functionName: string
): ts.Type | undefined {
  const typeChecker = program.getTypeChecker();
  const sourceFile = program.getSourceFile('test.ts');

  if (!sourceFile) {
    return undefined;
  }

  let returnType: ts.Type | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.name.text === functionName
    ) {
      const signature = typeChecker.getSignatureFromDeclaration(node);
      if (signature) {
        returnType = signature.getReturnType();
      }
    }
  });

  return returnType;
}
