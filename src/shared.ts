import type {Type, TypeChecker} from 'typescript';

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

export interface ProjectContext {
  name: string;
  version: string;
  description?: string;
  tools: SourceToolInfo[];
  transport?: Transport;
  sourceFilePath: string;
  outputFilePath: string;
  typeChecker: TypeChecker;
}
