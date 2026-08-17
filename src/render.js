function pad(value, width) {
  return String(value).padEnd(width);
}

export function renderExplain(result) {
  const lines = [
    `ContextScope — ${result.agent}`,
    '',
    `Target: ${result.target}`,
    `Certainty: ${result.certainty}`,
    `Estimated context: ${result.approxTokens} tokens (${result.bytes} bytes)`,
    '',
    'Applied:'
  ];
  if (result.sources.length === 0) lines.push('  (none)');
  result.sources.forEach((source, index) => lines.push(`  ${index + 1}. ${source.path}${source.role ? ` [${source.role}]` : ''}`));
  if (result.conditional.length) {
    lines.push('', 'Conditional / not applied:');
    for (const source of result.conditional) lines.push(`  - ${source.path} — ${source.reason}`);
  }
  if (result.missingReferences.length) {
    lines.push('', 'Missing references:');
    for (const item of result.missingReferences) lines.push(`  - ${item.source}: @${item.ref}`);
  }
  if (result.notes.length) {
    lines.push('', 'Notes:');
    for (const note of result.notes) lines.push(`  - ${note}`);
  }
  return `${lines.join('\n')}\n`;
}

export function renderMatrix(result) {
  const lines = [`ContextScope matrix — ${result.target}`, '', `${pad('Agent', 12)} ${pad('Sources', 8)} ${pad('Tokens', 8)} Certainty`];
  lines.push('-'.repeat(46));
  for (const item of result.agents) lines.push(`${pad(item.agent, 12)} ${pad(item.sources.length, 8)} ${pad(item.approxTokens, 8)} ${item.certainty}`);
  const fingerprints = result.agents.map((item) => new Set(item.sources.map((source) => source.path)));
  const union = new Set(fingerprints.flatMap((set) => [...set]));
  const common = [...union].filter((value) => fingerprints.every((set) => set.has(value)));
  lines.push('', `Shared source-file parity: ${union.size === 0 ? 100 : Math.round((common.length / union.size) * 100)}%`);
  lines.push('Use `contextscope diff <path> --agent A --agent B` for instruction-line parity.');
  return `${lines.join('\n')}\n`;
}

export function renderDiff(diff) {
  const [a, b] = diff.agents;
  const lines = [
    `ContextScope diff — ${diff.target}`,
    '',
    `${a} ↔ ${b} instruction-line parity: ${diff.parity}%`,
    `Shared: ${diff.shared.length} | only ${a}: ${diff.onlyA.length} | only ${b}: ${diff.onlyB.length}`
  ];
  if (diff.onlyA.length) {
    lines.push('', `Only ${a}:`);
    diff.onlyA.slice(0, 20).forEach((line) => lines.push(`  - ${line}`));
    if (diff.onlyA.length > 20) lines.push(`  … ${diff.onlyA.length - 20} more`);
  }
  if (diff.onlyB.length) {
    lines.push('', `Only ${b}:`);
    diff.onlyB.slice(0, 20).forEach((line) => lines.push(`  - ${line}`));
    if (diff.onlyB.length > 20) lines.push(`  … ${diff.onlyB.length - 20} more`);
  }
  return `${lines.join('\n')}\n`;
}

export function renderScan(scan) {
  const lines = [
    'ContextScope scan',
    '',
    `Instruction files: ${scan.summary.files}`,
    `Warnings: ${scan.summary.warnings}`,
    `Notes: ${scan.summary.notes}`
  ];
  for (const issue of scan.issues) lines.push(`- ${issue.level.toUpperCase()} ${issue.code} ${issue.path}: ${issue.message}`);
  return `${lines.join('\n')}\n`;
}
