import type {ProjectDependency} from './shared.js';
import {x} from 'tinyexec';
import * as prompts from '@clack/prompts';
import {resolveCommand} from 'package-manager-detector/commands';
import {detect} from 'package-manager-detector/detect';

export async function installDependencies(
  dependencies: ProjectDependency[],
  cwd: string,
  silent: boolean
): Promise<void> {
  const packageManager = await detect();
  if (!packageManager) {
    throw new Error('Could not detect package manager');
  }

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

  const resolvedCommand = resolveCommand(packageManager.agent, 'add', [
    '--save'
  ]);

  if (!resolvedCommand) {
    // TODO (43081j): maybe return or throw an error?
    return;
  }

  const {command, args} = resolvedCommand;

  if (prodDeps.length > 0) {
    let spinner: ReturnType<typeof prompts.spinner> | null = null;

    if (!silent) {
      spinner = prompts.spinner();
      spinner.start('Installing new production dependencies...');
    }

    await x(command, [...args, ...prodDeps], {
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
    await x(command, [...args, ...devDeps], {
      nodeOptions: {cwd}
    });
    if (!silent && spinner) {
      spinner.stop('Development dependencies installed.');
    }
  }
}
