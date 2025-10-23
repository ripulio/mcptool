import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

export interface CompilerOptions {
  outDir?: string;
  outExtension?: string;
}

export async function compileFile(
  filePath: string,
  options?: CompilerOptions
): Promise<void> {
  const outDir = options?.outDir || '.';
  const outExtension = options?.outExtension || '.mjs';
  const input = await readFile(filePath, 'utf-8');
  const extname = path.extname(filePath);

  if (extname !== 'ts') {
    throw new Error('Only TypeScript files are supported.');
  }

  const outputName = path.basename(filePath, extname) + outExtension;

  const outputPath = path.join(outDir, outputName);
  const output = await compile(input);

  await writeFile(outputPath, output);
}

export async function compile(input: string): Promise<string> {
  return '';
}
