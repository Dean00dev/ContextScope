export const VERSION = '0.1.0';

export const AGENTS = Object.freeze({
  CODEX: 'codex',
  CLAUDE: 'claude',
  COPILOT: 'copilot',
  CURSOR: 'cursor',
  GEMINI: 'gemini'
});

export const AGENT_LIST = Object.freeze(Object.values(AGENTS));

export const CERTAINTY = Object.freeze({
  EXACT: 'exact',
  PARTIAL: 'partial',
  CONDITIONAL: 'conditional'
});
