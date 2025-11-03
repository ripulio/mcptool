import type {Type, TypeChecker} from 'typescript';
import * as prompts from '@clack/prompts';

export interface SourceParameter {
  name: string;
  type: Type;
  optional?: boolean;
  description?: string;
  defaultValue?: string;
}

export interface SourceToolInfo {
  name: string;
  description?: string;
  parameters: SourceParameter[];
  returnType: Type;
}

export type Transport = 'stdio' | 'http';

export interface ProjectDependency {
  type: 'dev' | 'prod';
  name: string;
  version: string;
}

export type MCPFlavor = 'tmcp' | 'mcp';

export interface ProjectContext {
  name: string;
  version: string;
  description?: string;
  tools: SourceToolInfo[];
  transport: Transport;
  sourceFilePath: string;
  outputFilePath: string;
  typeChecker: TypeChecker;
  flavor: MCPFlavor;
  logger: typeof prompts.log;
}

export interface CompilerOptions {
  outDir?: string;
  outExtension?: string;
  cwd?: string;
  transport?: Transport;
  name?: string;
  version?: string;
  flavor?: MCPFlavor;
  silent?: boolean;
}

export const validMCPFlavors: MCPFlavor[] = ['tmcp', 'mcp'];
export const validTransports: Transport[] = ['stdio', 'http'];

/**
 * Checks if a type is CallToolResult by examining its type name.
 * A type is considered a CallToolResult if its symbol name matches 'CallToolResult'.
 */
function isCallToolResultLike(type: Type): boolean {
  const symbol = type.getSymbol();
  if (symbol?.getName() === 'CallToolResult') {
    return true;
  }

  if (type.aliasSymbol?.getName() === 'CallToolResult') {
    return true;
  }

  return false;
}

/**
 * Generates code to transform a tool's return value into a CallToolResult.
 * @param tool - The tool info containing the return type
 * @param checker - The TypeScript type checker
 * @param resultVar - The name of the variable holding the result (default: 'result')
 * @returns Generated JavaScript code as a string
 */
export function generateToolReturn(
  tool: SourceToolInfo,
  checker: TypeChecker,
  resultVar: string = 'result'
): string {
  const returnType = tool.returnType;
  const awaitedType = checker.getAwaitedType(returnType) ?? returnType;

  if (isCallToolResultLike(awaitedType)) {
    return resultVar;
  }

  return `{
    success: true,
    content: [{
      type: 'text',
      text: JSON.stringify(${resultVar}, null, 2)
    }]
  }`;
}
