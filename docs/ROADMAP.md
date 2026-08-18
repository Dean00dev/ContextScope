# Roadmap

ContextScope is optimized for evidence value rather than feature count.

## v0.1 — effective context visibility

- five agent profiles;
- `explain`, `matrix`, `diff`, `scan`, `doctor`;
- repository-local import checks;
- exact-line drift comparison;
- JSON, Markdown, SARIF and JUnit scan evidence;
- zero-runtime-dependency CLI and GitHub Action;
- Linux/macOS/Windows CI.

## v0.2 — adoption and first-run experience

- run directly with `npx --yes github:Dean00dev/ContextScope ...`;
- five-minute quickstart;
- clearer first-run command discovery;
- release-ready GitHub Action examples;
- synchronized release metadata and improved repository discoverability.

## v0.3 — pull-request blast radius

Given a before/after commit, identify which repository paths have a changed effective instruction set for each agent.

Target output:

> `.github/instructions/security.instructions.md` changed. Effective Copilot instructions changed for 47 tracked files. Codex unaffected. Claude unaffected.

This requires deterministic changed-path enumeration, cached profile resolution and explicit handling of deleted/renamed instruction files.

## v0.4 — parity policy

- baseline files;
- allowlisted intentional divergence;
- minimum parity/drift budgets;
- “new agent surface introduced” policy;
- CI regression comparison across commits.

## v0.5 — provenance graph

Export a machine-readable graph of instruction files, imports, scope edges and target applicability for visualization/editor integrations.

## Not planned without evidence

- calling an LLM to decide what instructions “mean” by default;
- pretending every coding agent shares one universal precedence model;
- hidden telemetry;
- editing or synchronizing user files automatically.
