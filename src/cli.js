#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_LIST, VERSION } from './constants.js';
import { diffExplanations, explain, matrix, scanRepository } from './analyze.js';
import { findRepoRoot, normalizeTarget } from './paths.js';
import { renderDiff, renderExplain, renderMatrix, renderScan } from './render.js';
import { scanToMarkdown, scanToSarif, scanToJunit } from './report.js';

const HELP = `ContextScope ${VERSION}\n\nSee the instructions your coding agents actually see.\n\nUsage:\n  contextscope explain <path> --agent <codex|claude|copilot|cursor|gemini> [--json]\n  contextscope matrix <path> [--json]\n  contextscope diff <path> --agent <A> --agent <B> [--json]\n  contextscope scan [--format text|json|markdown|sarif|junit] [--output FILE] [--fail-on-warning]\n  contextscope doctor [--json]\n  contextscope --version\n`;

function parse(argv) {
  const positionals = [];
  const options = { agents: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    if (token === '--json') options.json = true;
    else if (token === '--fail-on-warning') options.failOnWarning = true;
    else if (token === '--agent') {
      const value = argv[++i];
      if (!value) throw new Error('--agent requires a value');
      options.agents.push(value.toLowerCase());
    } else if (token === '--format' || token === '--output') {
      const value = argv[++i];
      if (!value) throw new Error(`${token} requires a value`);
      options[token.slice(2)] = value;
    } else throw new Error(`unknown option: ${token}`);
  }
  return { positionals, options };
}

function validateAgent(agent) {
  if (!AGENT_LIST.includes(agent)) throw new Error(`agent must be one of: ${AGENT_LIST.join(', ')}`);
}

async function emit(value, output) {
  if (output) {
    await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await fs.writeFile(output, value, 'utf8');
  } else process.stdout.write(value);
}

export async function runCli(argv = process.argv.slice(2)) {
  if (!argv.length || ['-h', '--help', 'help'].includes(argv[0])) {
    process.stdout.write(HELP);
    return 0;
  }
  if (['-v', '--version'].includes(argv[0])) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const { positionals, options } = parse(argv);
  const command = positionals[0];
  const root = await findRepoRoot();

  if (command === 'explain') {
    if (options.agents.length !== 1) throw new Error('explain requires exactly one --agent');
    validateAgent(options.agents[0]);
    const target = normalizeTarget(root, positionals[1] ?? '.');
    const result = await explain({ agent: options.agents[0], root, target });
    await emit(options.json ? `${JSON.stringify(result, null, 2)}\n` : renderExplain(result), options.output);
    return 0;
  }

  if (command === 'matrix') {
    const target = normalizeTarget(root, positionals[1] ?? '.');
    const result = await matrix({ root, target });
    await emit(options.json ? `${JSON.stringify(result, null, 2)}\n` : renderMatrix(result), options.output);
    return 0;
  }

  if (command === 'diff') {
    if (options.agents.length !== 2) throw new Error('diff requires two --agent values');
    options.agents.forEach(validateAgent);
    const target = normalizeTarget(root, positionals[1] ?? '.');
    const first = await explain({ agent: options.agents[0], root, target });
    const second = await explain({ agent: options.agents[1], root, target });
    const result = diffExplanations(first, second);
    await emit(options.json ? `${JSON.stringify(result, null, 2)}\n` : renderDiff(result), options.output);
    return 0;
  }

  if (command === 'scan') {
    const result = await scanRepository(root);
    const format = options.json ? 'json' : (options.format ?? 'text');
    let output;
    if (format === 'text') output = renderScan(result);
    else if (format === 'json') output = `${JSON.stringify(result, null, 2)}\n`;
    else if (format === 'markdown') output = `${scanToMarkdown(result)}\n`;
    else if (format === 'sarif') output = `${JSON.stringify(scanToSarif(result), null, 2)}\n`;
    else if (format === 'junit') output = scanToJunit(result);
    else throw new Error('format must be text, json, markdown, sarif, or junit');
    await emit(output, options.output);
    return options.failOnWarning && result.summary.warnings > 0 ? 1 : 0;
  }

  if (command === 'doctor') {
    const scan = await scanRepository(root);
    const result = {
      version: VERSION,
      node: process.version,
      root,
      supportedAgents: AGENT_LIST,
      instructionFiles: scan.summary.files,
      warnings: scan.summary.warnings,
      status: scan.summary.warnings ? 'attention' : 'ok'
    };
    await emit(options.json ? `${JSON.stringify(result, null, 2)}\n` : `ContextScope doctor\n\nVersion: ${result.version}\nNode: ${result.node}\nInstruction files: ${result.instructionFiles}\nWarnings: ${result.warnings}\nStatus: ${result.status.toUpperCase()}\n`, options.output);
    return 0;
  }

  throw new Error(`unknown command: ${command}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli().then((code) => { process.exitCode = code; }, (error) => {
    process.stderr.write(`ContextScope error: ${error.message}\n`);
    process.exitCode = 2;
  });
}
