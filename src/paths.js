import fs from 'node:fs/promises';
import path from 'node:path';

export function isWithin(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export async function findRepoRoot(start = process.cwd()) {
  let current = path.resolve(start);
  try {
    const stat = await fs.stat(current);
    if (!stat.isDirectory()) current = path.dirname(current);
  } catch {
    current = path.dirname(current);
  }

  while (true) {
    try {
      const stat = await fs.stat(path.join(current, '.git'));
      if (stat.isDirectory() || stat.isFile()) return current;
    } catch {
      // keep walking
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error('not inside a Git repository');
    current = parent;
  }
}

export function normalizeTarget(root, value = '.') {
  const absolute = path.resolve(root, value);
  if (!isWithin(root, absolute)) throw new Error('target must stay inside the repository');
  return absolute;
}

export async function targetDirectory(target) {
  try {
    return (await fs.stat(target)).isDirectory() ? target : path.dirname(target);
  } catch {
    return path.extname(target) ? path.dirname(target) : target;
  }
}

export function directoriesBetween(root, directory) {
  const dirs = [];
  let current = path.resolve(directory);
  const resolvedRoot = path.resolve(root);
  if (!isWithin(resolvedRoot, current)) throw new Error('target must stay inside the repository');
  while (true) {
    dirs.push(current);
    if (current === resolvedRoot) break;
    current = path.dirname(current);
  }
  return dirs.reverse();
}

export function relative(root, absolute) {
  const value = path.relative(root, absolute).replaceAll('\\', '/');
  return value || '.';
}

export async function exists(value) {
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
}

export async function walk(root, options = {}) {
  const files = [];
  const ignored = new Set(options.ignore ?? ['.git', 'node_modules']);
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  await visit(root);
  return files;
}
