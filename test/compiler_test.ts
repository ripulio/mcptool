import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {compile} from '../src/compiler.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import os from 'node:os';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  './fixtures'
);
const basicFixture = path.join(fixtureDir, 'basic/input.ts');

describe('compile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-compiler-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('basic file (tmcp, stdio)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(basicFixture, {
      outFile,
      cwd: path.dirname(basicFixture),
      flavor: 'tmcp',
      transport: 'stdio',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = fs.readFileSync(outFile, 'utf-8');
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
    const result = await compile(basicFixture, {
      outFile,
      cwd: path.dirname(basicFixture),
      flavor: 'mcp',
      transport: 'stdio',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = fs.readFileSync(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });

  it('basic file (tmcp, http)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(basicFixture, {
      outFile,
      cwd: path.dirname(basicFixture),
      flavor: 'tmcp',
      transport: 'http',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = fs.readFileSync(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });

  it('basic file (mcp, http)', async () => {
    const outFile = path.join(tempDir, 'output.js');
    const result = await compile(basicFixture, {
      outFile,
      cwd: path.dirname(basicFixture),
      flavor: 'mcp',
      transport: 'http',
      silent: true
    });

    expect(result.success).toBe(true);

    const outFileContents = fs.readFileSync(outFile, 'utf-8');
    expect(outFileContents).toMatchSnapshot();
  });
});
