import {x} from 'tinyexec';
import {existsSync} from 'fs';
import {join, relative} from 'path';

export async function tryFormatFile(path: string, cwd: string): Promise<void> {
  const relativePath = relative(cwd, path);

  const prettierExists = existsSync(join(cwd, 'node_modules', 'prettier'));
  if (prettierExists) {
    try {
      const result = await x('npx', ['prettier', '--write', relativePath], {
        nodeOptions: {cwd}
      });
      if (result.exitCode !== 0) {
        console.error('Prettier formatting failed:', result.stderr);
      } else {
        return;
      }
    } catch {
      // Silently fail if prettier fails
    }
  }

  const biomeExists = existsSync(
    join(cwd, 'node_modules', '@biomejs', 'biome')
  );
  if (biomeExists) {
    try {
      const result = await x(
        'npx',
        ['@biomejs/biome', 'format', '--write', relativePath],
        {nodeOptions: {cwd}}
      );
      if (result.exitCode !== 0) {
        console.error('Biome formatting failed:', result.stderr);
      }
    } catch {
      // Silently fail if biome fails
    }
  }
}
