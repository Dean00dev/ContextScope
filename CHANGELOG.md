# Changelog

All notable changes to ContextScope are documented here.

## [0.2.0] - 2026-08-18

### Added

- frictionless `npx --yes github:Dean00dev/ContextScope ...` usage for first-run evaluation;
- a five-minute quickstart covering local inspection, cross-agent comparison, repository scanning and CI adoption;
- release badge and clearer zero-account/zero-API-key onboarding.

### Changed

- GitHub Action examples now target `v0.2.0`;
- README positioning and command discovery are optimized for first-time visitors;
- roadmap numbering reflects the onboarding release before PR impact analysis.

### Preserved

- no runtime dependencies, telemetry, model calls or API keys;
- explicit exact/partial/conditional certainty boundaries;
- existing five-agent analysis semantics.

## [0.1.0] - 2026-08-17

### Added

- path-aware effective instruction reconstruction for Codex, Claude Code, GitHub Copilot, Cursor and Gemini CLI;
- `explain`, `matrix`, `diff`, `scan`, and `doctor` CLI commands;
- repository-local `@` reference validation for Claude/Gemini-style context files;
- exact-line instruction parity comparison;
- static repository findings for missing references, reference escapes, duplicates and multi-agent instruction surfaces;
- JSON, Markdown, SARIF and JUnit evidence formats;
- zero-runtime-dependency GitHub Action;
- cross-platform Node 20/24 CI.
