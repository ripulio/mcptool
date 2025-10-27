import ts from 'typescript';

export class InvalidParameterError extends Error {
  constructor(
    functionName: string,
    paramName: string,
    sourceFile: ts.SourceFile,
    param: ts.ParameterDeclaration
  ) {
    const start = param.getStart(sourceFile);
    const end = param.getEnd();
    const {line, character} = sourceFile.getLineAndCharacterOfPosition(start);
    const lineStart = sourceFile.getPositionOfLineAndCharacter(line, 0);

    // Find the end of the line (next newline or end of file)
    let lineEnd = sourceFile.text.indexOf('\n', lineStart);
    if (lineEnd === -1) {
      lineEnd = sourceFile.text.length;
    }

    const lineText = sourceFile.text.substring(lineStart, lineEnd);
    const paramStart = character;
    const paramEnd = character + (end - start);

    const message = [
      `\nError extracting function "${functionName}":`,
      `  File: ${sourceFile.fileName}:${line + 1}:${character + 1}`,
      `  ${lineText}`,
      `  ${' '.repeat(paramStart)}${'~'.repeat(paramEnd - paramStart)}`,
      `  Parameter "${paramName}" has an unsupported type.`,
      `  Only plain objects, primitives, and arrays are allowed.\n`
    ].join('\n');

    super(message);
    this.name = 'InvalidParameterError';
  }
}
