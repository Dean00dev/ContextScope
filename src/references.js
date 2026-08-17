import fs from 'node:fs/promises';
import path from 'node:path';
import { exists, isWithin, relative } from './paths.js';

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/gu, '').replace(/`[^`]*`/gu, '');
}

export function extractAtReferences(text) {
  const clean = stripCode(text);
  const refs = [];
  const pattern = /(?:^|[\s(])@((?:\.\.?\/|~\/)?[A-Za-z0-9_./~\-]+(?:\.[A-Za-z0-9_-]+)?)/gmu;
  for (const match of clean.matchAll(pattern)) refs.push(match[1].replace(/[.,;:!?]+$/u, ''));
  return [...new Set(refs)];
}

export async function resolveReferences({ root, sourceFile, text, allowHome = false, maxDepth = 5 }) {
  const seen = new Set();
  const imported = [];
  const missing = [];
  const unsafe = [];

  async function visit(file, content, depth) {
    if (depth > maxDepth) return;
    for (const ref of extractAtReferences(content)) {
      if (ref.startsWith('~/')) {
        if (!allowHome) {
          unsafe.push({ source: relative(root, file), ref, reason: 'home reference is outside repository analysis' });
        }
        continue;
      }
      const candidate = path.resolve(path.dirname(file), ref);
      if (!isWithin(root, candidate)) {
        unsafe.push({ source: relative(root, file), ref, reason: 'reference leaves repository' });
        continue;
      }
      const key = candidate;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!(await exists(candidate))) {
        missing.push({ source: relative(root, file), ref, resolved: relative(root, candidate) });
        continue;
      }
      const rootReal = await fs.realpath(root);
      const candidateReal = await fs.realpath(candidate);
      if (!isWithin(rootReal, candidateReal)) {
        unsafe.push({ source: relative(root, file), ref, reason: 'reference resolves through a symlink outside repository' });
        continue;
      }
      const child = await fs.readFile(candidateReal, 'utf8');
      imported.push({ path: relative(root, candidate), content: child, depth });
      await visit(candidate, child, depth + 1);
    }
  }

  await visit(sourceFile, text, 1);
  return { imported, missing, unsafe };
}
