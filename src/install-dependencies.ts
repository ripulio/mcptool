import type {ProjectContext} from './shared.js';
import {x} from 'tinyexec';

export async function installDependencies(
  context: ProjectContext
): Promise<void> {
  const devDeps: string[] = [];
  const prodDeps: string[] = [];

  for (const dep of context.dependencies) {
    const depString = `${dep.name}@${dep.version}`;
    if (dep.type === 'dev') {
      devDeps.push(depString);
    } else if (dep.type === 'prod') {
      prodDeps.push(depString);
    }
  }

  if (prodDeps.length > 0) {
    console.log(`Installing production dependencies: ${prodDeps.join(', ')}`);
    await x('npm', ['install', '-S', ...prodDeps]);
  }

  if (devDeps.length > 0) {
    console.log(`Installing development dependencies: ${devDeps.join(', ')}`);
    await x('npm', ['install', '-D', ...devDeps]);
  }
}
