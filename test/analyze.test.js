import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { diffExplanations, explain, scanRepository } from '../src/analyze.js';
import { fixture } from './helpers.js';

test('diff reports exact instruction-line parity rather than pretending semantic equivalence', async (t) => {
  const root = await fixture({
    'AGENTS.md': '- run tests\n- use tabs',
    'CLAUDE.md': '- run tests\n- use spaces',
    'src/file.js': ''
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = path.join(root, 'src/file.js');
  const a = await explain({ agent: 'codex', root, target });
  const b = await explain({ agent: 'claude', root, target });
  const diff = diffExplanations(a, b);
  assert.equal(diff.shared.length, 1);
  assert.equal(diff.onlyA.length, 1);
  assert.equal(diff.onlyB.length, 1);
  assert.equal(diff.parity, 33);
});

test('scan catches missing references and duplicate instructions', async (t) => {
  const root = await fixture({
    'AGENTS.md': '- This sufficiently long instruction is shared everywhere\n- See @docs/nope.md',
    'CLAUDE.md': '- This sufficiently long instruction is shared everywhere'
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const scan = await scanRepository(root);
  assert.ok(scan.issues.some((issue) => issue.code === 'missing-reference'));
  assert.ok(scan.issues.some((issue) => issue.code === 'duplicate-instruction'));
});

test('reference parser does not treat sentence punctuation as part of a path', async (t) => {
  const root = await fixture({
    'CLAUDE.md': 'Read @docs/style.md.',
    'docs/style.md': 'style'
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const scan = await scanRepository(root);
  assert.equal(scan.issues.filter((issue) => issue.code === 'missing-reference').length, 0);
});

test('repository references cannot escape through symlinks', { skip: process.platform === 'win32' }, async (t) => {
  const root = await fixture({ 'CLAUDE.md': 'Read @linked.txt' });
  const outside = await fs.mkdtemp(path.join(path.dirname(root), 'contextscope-outside-'));
  await fs.writeFile(path.join(outside, 'secret.txt'), 'outside', 'utf8');
  await fs.symlink(path.join(outside, 'secret.txt'), path.join(root, 'linked.txt'));
  t.after(() => Promise.all([
    fs.rm(root, { recursive: true, force: true }),
    fs.rm(outside, { recursive: true, force: true })
  ]));
  const scan = await scanRepository(root);
  assert.ok(scan.issues.some((issue) => issue.code === 'reference-escape'));
});
