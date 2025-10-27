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
  dependencies: ProjectDependency[];
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
