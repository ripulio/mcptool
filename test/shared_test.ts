import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {generateToolReturn, type SourceToolInfo} from '../src/shared.js';
import ts from 'typescript';
import {createProgram, getReturnType} from './utils.js';

describe('generateToolReturn', () => {
  let program: ts.Program;
  let typeChecker: ts.TypeChecker;

  beforeAll(() => {
    const sourceCode = `
      function fn(): string {
        return 'hello';
      }

      function fnReturnsResult(): CallToolResult<string> {
        return {
          success: true,
          content: [{type: 'text', text: 'hello'}]
        };
      }

      async function fnReturnsAsyncResult(): Promise<CallToolResult<string>> {
        return {
          success: true,
          content: [{type: 'text', text: 'hello'}]
        };
      }
    `;

    program = createProgram(sourceCode);
    typeChecker = program.getTypeChecker();
  });

  afterAll(() => {
    program = undefined as never;
    typeChecker = undefined as never;
  });

  it('should return variable if return type is CallToolResult', () => {
    const returnType = getReturnType(program, 'fnReturnsResult')!;
    const tool: SourceToolInfo = {
      name: 'testTool',
      description: 'A test tool',
      returnType,
      parameters: []
    };

    const result = generateToolReturn(tool, typeChecker, 'result');
    expect(result).toBe('result');
  });

  it('should wrap return value in CallToolResult if not already', () => {
    const returnType = getReturnType(program, 'fn')!;
    const tool: SourceToolInfo = {
      name: 'testTool',
      description: 'A test tool',
      returnType,
      parameters: []
    };

    const result = generateToolReturn(tool, typeChecker, 'result');
    expect(result).toMatchSnapshot();
  });

  it('should return variable if return type is an async CallToolResult', () => {
    const returnType = getReturnType(program, 'fnReturnsAsyncResult')!;
    const awaitedType = typeChecker.getAwaitedType(returnType)!;
    const tool: SourceToolInfo = {
      name: 'testTool',
      description: 'A test tool',
      returnType: awaitedType,
      parameters: []
    };

    const result = generateToolReturn(tool, typeChecker, 'result');
    expect(result).toBe('result');
  });
});
