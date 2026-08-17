import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export async function fixture(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextscope-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }
  await new Promise((resolve, reject) => {
    const child = spawn('git', ['init', '--quiet'], { cwd: root });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error('git init failed')));
  });
  return root;
}
