import fs from 'node:fs/promises';
import path from 'node:path';
import { scanRepository } from './analyze.js';
import { scanToMarkdown, scanToSarif, scanToJunit } from './report.js';
import { findRepoRoot, isWithin } from './paths.js';

async function append(file, text) {
  if (!file) return;
  await fs.appendFile(file, text, 'utf8');
}

async function main() {
  const root = await findRepoRoot(process.env.GITHUB_WORKSPACE || process.cwd());
  const reportDir = path.resolve(root, process.env.INPUT_REPORT_DIR || 'contextscope-report');
  if (!isWithin(path.resolve(root), reportDir)) throw new Error('report_dir must stay inside the repository');
  const failOnWarning = (process.env.INPUT_FAIL_ON_WARNING || 'false').toLowerCase() === 'true';
  const scan = await scanRepository(root);
  await fs.mkdir(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'contextscope-report.json');
  const sarifPath = path.join(reportDir, 'contextscope.sarif');
  const junitPath = path.join(reportDir, 'contextscope.junit.xml');
  const markdownPath = path.join(reportDir, 'contextscope-summary.md');
  const markdown = scanToMarkdown(scan);
  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(scan, null, 2)}\n`, 'utf8'),
    fs.writeFile(sarifPath, `${JSON.stringify(scanToSarif(scan), null, 2)}\n`, 'utf8'),
    fs.writeFile(junitPath, scanToJunit(scan), 'utf8'),
    fs.writeFile(markdownPath, `${markdown}\n`, 'utf8')
  ]);
  await append(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  await append(process.env.GITHUB_OUTPUT, `warnings=${scan.summary.warnings}\nfiles=${scan.summary.files}\njson_report=${jsonPath}\nsarif_report=${sarifPath}\njunit_report=${junitPath}\nmarkdown_report=${markdownPath}\n`);
  process.stdout.write(`ContextScope: ${scan.summary.files} instruction files, ${scan.summary.warnings} warnings\n`);
  if (failOnWarning && scan.summary.warnings) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`::error title=ContextScope failed::${error.message}\n`);
  process.exitCode = 2;
});
