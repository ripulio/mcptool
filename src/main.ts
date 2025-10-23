import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

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

export async function compileFile(
  filePath: string,
  options?: CompilerOptions
): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options?.outDir || '.');
  const outExtension = options?.outExtension || '.mjs';
  const input = await readFile(filePath, 'utf-8');
  const extname = path.extname(filePath);

  if (extname !== 'ts') {
    throw new Error('Only TypeScript files are supported.');
  }

  const outputName = path.basename(filePath, extname) + outExtension;

  const outputPath = path.join(outDir, outputName);
  const output = await compile(input, options);

  await writeFile(outputPath, output);
}

export async function compile(
  input: string,
  options?: CompilerOptions
): Promise<string> {
  const cwd = options?.cwd ?? process.cwd();
  const fileName = 'input.ts';
  const compilerOptions = tryReadConfigFile(cwd);

  const host = ts.createCompilerHost(compilerOptions);

  const originalReadFile = host.readFile;
  host.readFile = (path) => {
    if (path === fileName) {
      return input;
    }
    return originalReadFile(path);
  };

  const originalFileExists = host.fileExists;
  host.fileExists = (path) => {
    if (path === fileName) {
      return true;
    }
    return originalFileExists ? originalFileExists(path) : false;
  };

  const program = ts.createProgram([fileName], compilerOptions, host);

  return '';
}
