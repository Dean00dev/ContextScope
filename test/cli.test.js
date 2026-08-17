import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture } from './helpers.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function run(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    child.stdout.on('data', (c) => out.push(c));
    child.stderr.on('data', (c) => err.push(c));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout: Buffer.concat(out).toString(), stderr: Buffer.concat(err).toString() }));
  });
}

test('matrix and JSON scan work from a repository', async (t) => {
  const root = await fixture({ 'AGENTS.md': 'test', 'src/file.js': '' });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const matrix = await run(['matrix', 'src/file.js'], root);
  assert.equal(matrix.code, 0);
  assert.match(matrix.stdout, /codex/u);
  assert.match(matrix.stdout, /claude/u);
  const scan = await run(['scan', '--format', 'json'], root);
  assert.equal(scan.code, 0);
  assert.equal(JSON.parse(scan.stdout).instructionFiles.length, 1);
});

test('scan can fail CI on warning-level issues', async (t) => {
  const root = await fixture({ 'AGENTS.md': 'See @missing.md' });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await run(['scan', '--fail-on-warning'], root);
  assert.equal(result.code, 1);
});
