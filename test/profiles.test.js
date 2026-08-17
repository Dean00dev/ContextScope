import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { explain } from '../src/analyze.js';
import { fixture } from './helpers.js';

test('Codex applies root-to-target chain and prefers override within a directory', async (t) => {
  const root = await fixture({
    'AGENTS.md': 'root',
    'src/AGENTS.md': 'src base',
    'src/AGENTS.override.md': 'src override',
    'src/auth/file.js': 'x'
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await explain({ agent: 'codex', root, target: path.join(root, 'src/auth/file.js') });
  assert.deepEqual(result.sources.map((source) => source.path), ['AGENTS.md', 'src/AGENTS.override.md']);
});

test('Copilot applies repository-wide and matching path-specific instructions', async (t) => {
  const root = await fixture({
    '.github/copilot-instructions.md': 'global',
    '.github/instructions/ts.instructions.md': '---\napplyTo: "**/*.ts"\n---\nTypeScript rule',
    '.github/instructions/py.instructions.md': '---\napplyTo: "**/*.py"\n---\nPython rule',
    'src/file.ts': ''
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await explain({ agent: 'copilot', root, target: path.join(root, 'src/file.ts') });
  assert.deepEqual(result.sources.map((source) => source.path), ['.github/copilot-instructions.md', '.github/instructions/ts.instructions.md']);
  assert.equal(result.conditional.length, 1);
});

test('Cursor keeps agent-requested rules conditional', async (t) => {
  const root = await fixture({
    '.cursor/rules/always.mdc': '---\nalwaysApply: true\n---\nAlways',
    '.cursor/rules/auto.mdc': '---\nglobs: "**/*.ts"\nalwaysApply: false\n---\nTS only',
    '.cursor/rules/requested.mdc': '---\ndescription: "database guidance"\nalwaysApply: false\n---\nMaybe',
    'src/file.ts': ''
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await explain({ agent: 'cursor', root, target: path.join(root, 'src/file.ts') });
  assert.equal(result.sources.length, 2);
  assert.equal(result.conditional.length, 1);
});

test('Claude resolves repository-local imports and reports missing imports', async (t) => {
  const root = await fixture({
    'CLAUDE.md': 'Read @docs/style.md and @docs/missing.md',
    'docs/style.md': 'Use two spaces',
    'src/file.js': ''
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await explain({ agent: 'claude', root, target: path.join(root, 'src/file.js') });
  assert.ok(result.sources.some((source) => source.path === 'docs/style.md'));
  assert.equal(result.missingReferences.length, 1);
});

test('nested Cursor project rules stay scoped to their containing subtree', async (t) => {
  const root = await fixture({
    'frontend/.cursor/rules/frontend.mdc': '---\nalwaysApply: true\n---\nFrontend only',
    'frontend/app.ts': '',
    'backend/app.ts': ''
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const frontend = await explain({ agent: 'cursor', root, target: path.join(root, 'frontend/app.ts') });
  const backend = await explain({ agent: 'cursor', root, target: path.join(root, 'backend/app.ts') });
  assert.equal(frontend.sources.length, 1);
  assert.equal(backend.sources.length, 0);
  assert.match(backend.conditional[0].reason, /scoped to frontend/u);
});
