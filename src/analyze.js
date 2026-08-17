import fs from 'node:fs/promises';
import path from 'node:path';
import { AGENT_LIST } from './constants.js';
import { resolveProfile } from './profiles.js';
import { countApproxTokens, normalizedInstructionLines } from './text.js';
import { isWithin, walk, relative } from './paths.js';
import { extractAtReferences } from './references.js';

export function effectiveText(profile) {
  return profile.sources.map((source) => source.instructionContent ?? source.content).join('\n\n');
}

export async function explain({ agent, root, target }) {
  const profile = await resolveProfile(agent, root, target);
  const text = effectiveText(profile);
  return {
    ...profile,
    target: relative(root, target),
    bytes: Buffer.byteLength(text),
    approxTokens: countApproxTokens(text),
    instructionLines: normalizedInstructionLines(text).length,
    missingReferences: profile.missingReferences ?? [],
    unsafeReferences: profile.unsafeReferences ?? []
  };
}

export async function matrix({ root, target }) {
  const agents = [];
  for (const agent of AGENT_LIST) agents.push(await explain({ agent, root, target }));
  return { target: relative(root, target), agents };
}

export function diffExplanations(a, b) {
  const aLines = new Set(normalizedInstructionLines(effectiveText(a)));
  const bLines = new Set(normalizedInstructionLines(effectiveText(b)));
  const shared = [...aLines].filter((line) => bLines.has(line)).sort();
  const onlyA = [...aLines].filter((line) => !bLines.has(line)).sort();
  const onlyB = [...bLines].filter((line) => !aLines.has(line)).sort();
  const union = new Set([...aLines, ...bLines]).size;
  const parity = union === 0 ? 100 : Math.round((shared.length / union) * 100);
  return { agents: [a.agent, b.agent], target: a.target, parity, shared, onlyA, onlyB };
}

function classifyInstructionFile(rel) {
  if (/(^|\/)AGENTS(?:\.override)?\.md$/u.test(rel)) return 'codex/agents';
  if (/(^|\/)CLAUDE\.md$/u.test(rel)) return 'claude';
  if (/(^|\/)GEMINI\.md$/u.test(rel)) return 'gemini';
  if (rel === '.github/copilot-instructions.md') return 'copilot';
  if (/^\.github\/instructions\/.*\.instructions\.md$/u.test(rel)) return 'copilot-path';
  if (/(^|\/)\.cursor\/rules\/.*\.mdc$/u.test(rel)) return 'cursor';
  if (rel === '.cursorrules') return 'cursor-legacy';
  return null;
}

export async function scanRepository(root) {
  const files = await walk(root);
  const instructionFiles = [];
  const issues = [];
  const lineOwners = new Map();

  for (const file of files.sort()) {
    const rel = relative(root, file);
    const kind = classifyInstructionFile(rel);
    if (!kind) continue;
    const content = await fs.readFile(file, 'utf8');
    const lines = normalizedInstructionLines(content);
    instructionFiles.push({ path: rel, kind, bytes: Buffer.byteLength(content), approxTokens: countApproxTokens(content), lines: lines.length });
    for (const line of lines) {
      const owners = lineOwners.get(line) ?? [];
      owners.push(rel);
      lineOwners.set(line, owners);
    }
    for (const ref of extractAtReferences(content)) {
      if (ref.startsWith('~/')) {
        issues.push({ level: 'note', code: 'external-reference', path: rel, message: `home reference cannot be verified repository-locally: @${ref}` });
        continue;
      }
      const candidate = path.resolve(path.dirname(file), ref);
      if (!isWithin(path.resolve(root), candidate)) {
        issues.push({ level: 'warning', code: 'reference-escape', path: rel, message: `reference leaves repository: @${ref}` });
        continue;
      }
      try {
        await fs.access(candidate);
        const rootReal = await fs.realpath(root);
        const candidateReal = await fs.realpath(candidate);
        if (!isWithin(rootReal, candidateReal)) {
          issues.push({ level: 'warning', code: 'reference-escape', path: rel, message: `reference resolves outside repository: @${ref}` });
        }
      } catch {
        issues.push({ level: 'warning', code: 'missing-reference', path: rel, message: `referenced file is missing: @${ref}` });
      }
    }
  }

  for (const [line, owners] of lineOwners) {
    if (owners.length > 1 && line.length >= 20) {
      issues.push({ level: 'note', code: 'duplicate-instruction', path: owners[0], message: `same instruction appears in ${owners.length} files`, detail: { instruction: line, files: owners } });
    }
  }

  const families = new Set(instructionFiles.map((file) => file.kind.split('-')[0].split('/')[0]));
  if (families.size > 1) {
    issues.push({ level: 'note', code: 'multi-agent-surface', path: '.', message: `${families.size} instruction families detected; run contextscope matrix <path> to inspect parity.` });
  }

  return {
    schemaVersion: 1,
    root: '.',
    instructionFiles,
    issues,
    summary: {
      files: instructionFiles.length,
      warnings: issues.filter((issue) => issue.level === 'warning').length,
      notes: issues.filter((issue) => issue.level === 'note').length
    }
  };
}
