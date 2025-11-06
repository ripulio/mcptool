import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {compile} from '../src/compiler.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import {mkdtempSync} from 'node:fs';
import os from 'node:os';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  './fixtures'
);
const basicFixture = path.join(fixtureDir, 'basic/input.ts');

describe('compile', () => {
  let tempDir: string;
  let tempInputFile: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'mcp-compiler-test-'));
    tempInputFile = path.join(tempDir, 'input.ts');
    await fs.copyFile(basicFixture, tempInputFile);
  });

  afterEach(async () => {
    await fs.rm(tempDir, {recursive: true, force: true});
  });

  it('basic file (tmcp, stdio)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(tempInputFile, {
      outFile,
      cwd: tempDir,
      flavor: 'tmcp',
      transport: 'stdio',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = await fs.readFile(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });

  it('should handle non-existent input file gracefully', async () => {
    const result = await compile('non-existent-file.ts', {
      cwd: fixtureDir,
      silent: true
    });

    expect(result.success).toBe(false);
  });

  it('basic file (mcp, stdio)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(tempInputFile, {
      outFile,
      cwd: tempDir,
      flavor: 'mcp',
      transport: 'stdio',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = await fs.readFile(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });

  it('basic file (tmcp, http)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(tempInputFile, {
      outFile,
      cwd: tempDir,
      flavor: 'tmcp',
      transport: 'http',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = await fs.readFile(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });

  it('basic file (mcp, http)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(tempInputFile, {
      outFile,
      cwd: tempDir,
      flavor: 'mcp',
      transport: 'http',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = await fs.readFile(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });
});
