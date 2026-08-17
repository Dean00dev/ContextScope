import { escapeXml } from './text.js';

export function scanToMarkdown(scan) {
  const lines = [
    '# ContextScope report',
    '',
    `Instruction files: **${scan.summary.files}**  `,
    `Warnings: **${scan.summary.warnings}**  `,
    `Notes: **${scan.summary.notes}**`,
    '',
    '## Instruction surfaces',
    '',
    '| File | Family | Approx. tokens |',
    '| --- | --- | ---: |'
  ];
  for (const file of scan.instructionFiles) lines.push(`| \`${file.path}\` | ${file.kind} | ${file.approxTokens} |`);
  if (scan.instructionFiles.length === 0) lines.push('| _none detected_ | — | — |');
  lines.push('', '## Findings', '');
  for (const issue of scan.issues) lines.push(`- **${issue.level.toUpperCase()} ${issue.code}** — \`${issue.path}\`: ${issue.message}`);
  if (scan.issues.length === 0) lines.push('- No static findings.');
  lines.push('', '> ContextScope reports repository instruction structure. It does not guarantee that a model will follow an instruction.', '');
  return lines.join('\n');
}

export function scanToSarif(scan) {
  const rules = [];
  const seen = new Set();
  const results = [];
  for (const issue of scan.issues) {
    if (!seen.has(issue.code)) {
      seen.add(issue.code);
      rules.push({ id: `contextscope/${issue.code}`, shortDescription: { text: issue.code.replaceAll('-', ' ') } });
    }
    results.push({
      ruleId: `contextscope/${issue.code}`,
      level: issue.level === 'warning' ? 'warning' : 'note',
      message: { text: issue.message },
      locations: issue.path === '.' ? [] : [{ physicalLocation: { artifactLocation: { uri: issue.path } } }],
      properties: issue.detail ?? {}
    });
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'ContextScope', version: '0.1.0', rules } }, results }]
  };
}

export function scanToJunit(scan) {
  const failures = scan.issues.filter((issue) => issue.level === 'warning');
  const cases = scan.issues.map((issue, index) => {
    const name = escapeXml(`${issue.code} ${issue.path}`);
    if (issue.level === 'warning') return `  <testcase classname="ContextScope" name="${name}"><failure message="${escapeXml(issue.message)}"/></testcase>`;
    return `  <testcase classname="ContextScope" name="${name}"/>`;
  });
  if (cases.length === 0) cases.push('  <testcase classname="ContextScope" name="repository scan"/>');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="ContextScope" tests="${cases.length}" failures="${failures.length}">\n${cases.join('\n')}\n</testsuite>\n`;
}
