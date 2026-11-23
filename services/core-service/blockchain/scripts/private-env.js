import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const coreEnvPath = path.resolve(scriptDirectory, '../../.env');

export async function upsertPrivateEnv(values) {
  let content = '';
  try {
    content = await readFile(coreEnvPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const lines = content.split(/\r?\n/);
  const pending = new Map(Object.entries(values).map(([key, value]) => [key, String(value)]));
  const updated = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${value}`;
  });

  if (updated.length > 0 && updated.at(-1) !== '') updated.push('');
  for (const [key, value] of pending) updated.push(`${key}=${value}`);
  updated.push('');

  const temporaryPath = `${coreEnvPath}.blockchain-tmp`;
  await writeFile(temporaryPath, updated.join('\n'), {
    encoding: 'utf8',
    mode: 0o600
  });
  await rename(temporaryPath, coreEnvPath);
}
