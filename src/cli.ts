import sade from 'sade';
import * as prompts from '@clack/prompts';
import {resolve, dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {compile} from './compiler.js';
import {CompilerOptions, validMCPFlavors, validTransports} from './shared.js';
import {installDependencies} from './install-dependencies.js';
import {readPackageJSON} from 'pkg-types';

const prog = sade('mcp-compiler <filePath>', true);

prog
  .version('1.0.0')
  .option('--outDir, -o', 'Output directory for compiled files')
  .option('--ext, -e', 'Output file extension', '.ts')
  .option('--cwd, -c', 'Current working directory', '.')
  .option('--transport, -t', 'Transport method (stdio or http)', 'stdio')
  .option('--name, -n', 'Project name (defaults to `package.json` name)')
  .option(
    '--version, -v',
    'Project version (defaults to `package.json` version)'
  )
  .option('--flavor, -f', 'MCP flavor (tmcp or mcp)', 'tmcp')
  .option('--interactive, -i', 'Run in interactive mode', false)
  .option('--silent, -s', 'Suppress output messages', false)
  .option('--install', 'Automatically install missing dependencies', false)
  .action(async (filePath, options) => {
    const silent = options.silent === true;
    const compilerOpts: CompilerOptions = {
      outDir: options.outDir || undefined,
      outExtension: options.ext || undefined,
      cwd: options.cwd || undefined,
      transport: options.transport || undefined,
      name: options.name || undefined,
      version: options.version || undefined,
      flavor: options.flavor || undefined,
      silent
    };
    const cwd = resolve(options.cwd || process.cwd());
    if (!silent) {
      prompts.intro('MCP Compiler');
    }
    if (!compilerOpts.name || !compilerOpts.version) {
      try {
        const pkg = await readPackageJSON(cwd);
        if (pkg.name && !compilerOpts.name) {
          compilerOpts.name = pkg.name;
        }
        if (pkg.version && !compilerOpts.version) {
          compilerOpts.version = pkg.version;
        }
      } catch {
        // do nothing
      }
    }
    if (options.interactive) {
      const responses = await prompts.group(
        {
          filePath: () =>
            prompts.text({
              message: 'Entry point:',
              initialValue: filePath || ''
            }),
          outDir: () =>
            prompts.text({
              message: 'Output directory:',
              initialValue: compilerOpts.outDir || dirname(filePath)
            }),
          outExtension: () =>
            prompts.text({
              message: 'Output file extension:',
              initialValue: compilerOpts.outExtension || '.ts'
            }),
          transport: () =>
            prompts.select({
              message: 'Transport method:',
              options: validTransports.map((t) => ({value: t, label: t})),
              initialValue: compilerOpts.transport || 'stdio'
            }),
          name: () =>
            prompts.text({
              message: 'Project name:',
              initialValue: compilerOpts.name || 'Generated MCP Server'
            }),
          version: () =>
            prompts.text({
              message: 'Project version:',
              initialValue: compilerOpts.version || '1.0.0'
            }),
          flavor: () =>
            prompts.select({
              message: 'MCP flavor:',
              options: validMCPFlavors.map((f) => ({value: f, label: f})),
              initialValue: compilerOpts.flavor || 'tmcp'
            })
        },
        {
          onCancel: () => {
            prompts.cancel('Compilation cancelled.');
            process.exit(0);
          }
        }
      );
      compilerOpts.outDir = responses.outDir;
      compilerOpts.outExtension = responses.outExtension;
      compilerOpts.transport = responses.transport;
      compilerOpts.name = responses.name;
      compilerOpts.version = responses.version;
      compilerOpts.flavor = responses.flavor;
    }
    if (
      !compilerOpts.flavor ||
      !validMCPFlavors.includes(compilerOpts.flavor)
    ) {
      prompts.cancel(
        `Invalid flavor: ${compilerOpts.flavor}. Valid options are: ${validMCPFlavors.join(', ')}`
      );
      process.exitCode = 1;
      return;
    }
    if (
      !compilerOpts.transport ||
      !validTransports.includes(compilerOpts.transport)
    ) {
      prompts.cancel(
        `Invalid transport: ${compilerOpts.transport}. Valid options are: ${validTransports.join(', ')}`
      );
      process.exitCode = 1;
      return;
    }
    if (!filePath) {
      prompts.cancel(
        'No entry file specified. Please provide a file path or ensure your package.json has a valid "main" field.'
      );
      process.exitCode = 1;
      return;
    }
    const resolvedFilePath = resolve(cwd, filePath);
    if (!existsSync(resolvedFilePath)) {
      prompts.cancel(`Entry file does not exist: ${resolvedFilePath}`);
      process.exitCode = 1;
      return;
    }
    const result = await compile(filePath, compilerOpts);

    if (!result.success) {
      prompts.cancel('Compilation failed.');
      process.exitCode = 1;
      return;
    }

    if (options.install && result.dependencies.length > 0) {
      await installDependencies(result.dependencies, cwd, silent);
    }

    prompts.outro('Compilation successful!');
  });

prog.parse(process.argv);
