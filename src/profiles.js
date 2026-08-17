import fs from 'node:fs/promises';
import path from 'node:path';
import { AGENTS, CERTAINTY } from './constants.js';
import { directoriesBetween, exists, isWithin, relative, targetDirectory, walk } from './paths.js';
import { parseFrontmatter, matchesAnyGlob } from './text.js';
import { resolveReferences } from './references.js';

async function readSource(root, absolute, extra = {}) {
  const content = await fs.readFile(absolute, 'utf8');
  return { path: relative(root, absolute), content, ...extra };
}

async function codex(root, target) {
  const directory = await targetDirectory(target);
  const sources = [];
  for (const dir of directoriesBetween(root, directory)) {
    for (const name of ['AGENTS.override.md', 'AGENTS.md']) {
      const candidate = path.join(dir, name);
      if (await exists(candidate)) {
        const content = await fs.readFile(candidate, 'utf8');
        if (content.trim()) sources.push({ path: relative(root, candidate), content, role: name.includes('override') ? 'override' : 'instructions' });
        break;
      }
    }
  }
  return {
    agent: AGENTS.CODEX,
    certainty: CERTAINTY.EXACT,
    model: 'Repository instruction chain from project root to target directory; AGENTS.override.md wins within a directory.',
    sources,
    conditional: [],
    notes: ['Repository-only reconstruction; user-global ~/.codex guidance is intentionally outside scope.']
  };
}

async function claude(root, target) {
  const directory = await targetDirectory(target);
  const sources = [];
  const missingReferences = [];
  const unsafeReferences = [];
  for (const dir of directoriesBetween(root, directory)) {
    const candidate = path.join(dir, 'CLAUDE.md');
    if (!(await exists(candidate))) continue;
    const source = await readSource(root, candidate, { role: 'instructions' });
    sources.push(source);
    const refs = await resolveReferences({ root, sourceFile: candidate, text: source.content, allowHome: false, maxDepth: 5 });
    for (const item of refs.imported) sources.push({ ...item, role: 'import', importedBy: source.path });
    missingReferences.push(...refs.missing);
    unsafeReferences.push(...refs.unsafe);
  }
  return {
    agent: AGENTS.CLAUDE,
    certainty: CERTAINTY.PARTIAL,
    model: 'CLAUDE.md chain from repository root to target directory, plus repository-local @imports up to five hops.',
    sources,
    conditional: [],
    missingReferences,
    unsafeReferences,
    notes: [
      'Claude Code can discover nested CLAUDE.md files lazily when it reads those subtrees; this command reports the target path chain.',
      'User-level ~/.claude/CLAUDE.md and home imports are intentionally outside repository analysis.'
    ]
  };
}

async function gemini(root, target) {
  const directory = await targetDirectory(target);
  const sources = [];
  const missingReferences = [];
  const unsafeReferences = [];
  for (const dir of directoriesBetween(root, directory)) {
    const candidate = path.join(dir, 'GEMINI.md');
    if (!(await exists(candidate))) continue;
    const source = await readSource(root, candidate, { role: 'instructions' });
    sources.push(source);
    const refs = await resolveReferences({ root, sourceFile: candidate, text: source.content, allowHome: false, maxDepth: 5 });
    for (const item of refs.imported) sources.push({ ...item, role: 'import', importedBy: source.path });
    missingReferences.push(...refs.missing);
    unsafeReferences.push(...refs.unsafe);
  }
  return {
    agent: AGENTS.GEMINI,
    certainty: CERTAINTY.PARTIAL,
    model: 'Repository root-to-target GEMINI.md chain with repository-local @imports.',
    sources,
    conditional: [],
    missingReferences,
    unsafeReferences,
    notes: [
      'Gemini CLI also scans context files below the session working directory and respects ignore rules; v0.1 does not claim to reproduce that broad descendant scan.',
      'Global ~/.gemini/GEMINI.md is intentionally outside repository analysis.'
    ]
  };
}

async function copilot(root, target) {
  const sources = [];
  const conditional = [];
  const targetRel = relative(root, target);
  const repoWide = path.join(root, '.github', 'copilot-instructions.md');
  if (await exists(repoWide)) sources.push(await readSource(root, repoWide, { role: 'repository-wide' }));

  const instructionsDir = path.join(root, '.github', 'instructions');
  if (await exists(instructionsDir)) {
    const files = (await walk(instructionsDir, { ignore: [] })).filter((file) => file.endsWith('.instructions.md'));
    for (const file of files.sort()) {
      const content = await fs.readFile(file, 'utf8');
      const parsed = parseFrontmatter(content);
      const applyTo = parsed.data.applyTo;
      const entry = { path: relative(root, file), content, instructionContent: parsed.body, role: 'path-specific', applyTo: applyTo ?? null };
      if (applyTo && matchesAnyGlob(targetRel, applyTo)) sources.push(entry);
      else conditional.push({ ...entry, reason: applyTo ? 'applyTo does not match target' : 'missing applyTo frontmatter' });
    }
  }

  return {
    agent: AGENTS.COPILOT,
    certainty: CERTAINTY.EXACT,
    model: 'Repository-wide .github/copilot-instructions.md plus matching .github/instructions/**/*.instructions.md applyTo globs.',
    sources,
    conditional,
    notes: [
      'This profile models repository-wide and path-specific Copilot custom instructions. Copilot feature support for AGENTS.md/CLAUDE.md/GEMINI.md varies by surface and is intentionally reported separately by those profiles.'
    ]
  };
}

async function cursor(root, target) {
  const sources = [];
  const conditional = [];
  const legacy = path.join(root, '.cursorrules');
  if (await exists(legacy)) sources.push(await readSource(root, legacy, { role: 'legacy-always' }));

  const allFiles = await walk(root);
  const ruleFiles = allFiles.filter((file) => file.replaceAll('\\', '/').includes('/.cursor/rules/') && file.endsWith('.mdc'));
  for (const file of ruleFiles.sort()) {
    const content = await fs.readFile(file, 'utf8');
    const parsed = parseFrontmatter(content);
    const alwaysApply = String(parsed.data.alwaysApply ?? '').toLowerCase() === 'true';
    const globs = parsed.data.globs ?? '';
    const cursorDir = path.dirname(path.dirname(file));
    const scopeRoot = path.dirname(cursorDir);
    const inScope = isWithin(scopeRoot, target);
    const scopedTarget = inScope ? relative(scopeRoot, target) : null;
    const entry = {
      path: relative(root, file),
      content,
      instructionContent: parsed.body,
      role: 'project-rule',
      globs: globs || null,
      alwaysApply,
      scope: relative(root, scopeRoot)
    };
    if (inScope && (alwaysApply || (globs && matchesAnyGlob(scopedTarget, globs)))) sources.push(entry);
    else conditional.push({
      ...entry,
      reason: !inScope
        ? `rule is scoped to ${relative(root, scopeRoot)}`
        : (globs ? 'glob does not match target' : 'agent-requested/manual rule cannot be proven active statically')
    });
  }

  return {
    agent: AGENTS.CURSOR,
    certainty: CERTAINTY.CONDITIONAL,
    model: 'Always rules and target-matching auto-attached .cursor/rules/*.mdc rules; agent-requested/manual rules stay conditional.',
    sources,
    conditional,
    notes: ['.cursorrules is included as supported legacy project guidance but marked legacy.']
  };
}

export async function resolveProfile(agent, root, target) {
  if (agent === AGENTS.CODEX) return codex(root, target);
  if (agent === AGENTS.CLAUDE) return claude(root, target);
  if (agent === AGENTS.COPILOT) return copilot(root, target);
  if (agent === AGENTS.CURSOR) return cursor(root, target);
  if (agent === AGENTS.GEMINI) return gemini(root, target);
  throw new Error(`unsupported agent: ${agent}`);
}
