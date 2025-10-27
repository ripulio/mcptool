import type {ProjectDependency} from './shared.js';
import {x} from 'tinyexec';
import * as prompts from '@clack/prompts';

export async function installDependencies(
  dependencies: ProjectDependency[],
  cwd: string,
  silent: boolean
): Promise<void> {
  const devDeps: string[] = [];
  const prodDeps: string[] = [];

  for (const dep of dependencies) {
    const depString = `${dep.name}@${dep.version}`;
    if (dep.type === 'dev') {
      devDeps.push(depString);
    } else if (dep.type === 'prod') {
      prodDeps.push(depString);
    }
  }

  if (prodDeps.length > 0) {
    let spinner: ReturnType<typeof prompts.spinner> | null = null;

    if (!silent) {
      spinner = prompts.spinner();
      spinner.start('Installing new production dependencies...');
    }
    await x('npm', ['install', '-S', ...prodDeps], {
      nodeOptions: {cwd}
    });
    if (!silent && spinner) {
      spinner.stop('Production dependencies installed.');
    }
  }

  if (devDeps.length > 0) {
    let spinner: ReturnType<typeof prompts.spinner> | null = null;

    if (!silent) {
      spinner = prompts.spinner();
      spinner.start('Installing new development dependencies...');
    }
    await x('npm', ['install', '-D', ...devDeps], {
      nodeOptions: {cwd}
    });
    if (!silent && spinner) {
      spinner.stop('Development dependencies installed.');
    }
  }
}
