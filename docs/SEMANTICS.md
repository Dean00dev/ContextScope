# Semantics and limits

ContextScope reconstructs repository-provided coding-agent instruction surfaces. Its profiles intentionally differ because the products differ.

## Codex

Modeled behaviour:

- from the repository/project root to the target directory, inspect each directory in order;
- in each directory prefer `AGENTS.override.md`, otherwise `AGENTS.md`;
- concatenate root-to-leaf so more specific guidance appears later.

The target file's parent directory is used as the simulated working directory. User-global `~/.codex` files and configured fallback filenames are outside v0.1 repository analysis.

Primary source: OpenAI, “Custom instructions with AGENTS.md” — https://developers.openai.com/codex/guides/agents-md

## Claude Code

Modeled behaviour:

- discover `CLAUDE.md` on the repository-root-to-target directory chain;
- follow repository-local `@path` imports recursively up to five hops;
- report missing or out-of-repository imports rather than silently fabricating them.

Claude Code can also load user memory and discover nested memory files as it reads other subtrees. Therefore ContextScope marks this profile **partial** for a target-path reconstruction.

Primary source: Anthropic Claude Code memory documentation — https://docs.anthropic.com/en/docs/claude-code/memory

## GitHub Copilot

Modeled behaviour:

- `.github/copilot-instructions.md` applies repository-wide;
- `.github/instructions/**/*.instructions.md` applies when its `applyTo` glob matches the target.

Copilot support for `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` varies by Copilot surface. ContextScope keeps those files in their named profiles rather than pretending one “Copilot” profile represents every IDE/cloud/review mode.

Primary sources:

- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- https://docs.github.com/en/copilot/reference/custom-instructions-support

## Cursor

Modeled behaviour:

- project rules under `.cursor/rules/**/*.mdc`;
- `alwaysApply: true` is treated as active;
- rules with matching `globs` are treated as target-attached;
- rules whose activation depends on agent relevance/manual selection remain **conditional**;
- legacy `.cursorrules` is reported as supported legacy guidance.

Primary source: Cursor Rules documentation — https://docs.cursor.com/context/rules

## Gemini CLI

Modeled behaviour:

- `GEMINI.md` files on the repository-root-to-target directory chain;
- repository-local `@file.md` imports.

Gemini CLI also scans context files below the session working directory and respects `.gitignore`/`.geminiignore`. v0.1 intentionally does not claim to reproduce that broad descendant scan, so this profile is **partial**.

Primary source: Gemini CLI “Provide Context with GEMINI.md Files” — https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html

## Token estimates

ContextScope's token number is an intentionally rough UI estimate (`ceil(characters / 4)`), not a tokenizer result. Different agents/models tokenize text differently. It is useful for spotting large changes, not billing or hard context-limit calculations.

## Parity

`contextscope diff` compares normalized non-heading instruction lines exactly. “Parity” means exact textual overlap, not semantic equivalence. ContextScope refuses to infer that “use two spaces” and “indent with 2 spaces” are the same policy without a model or a richer deterministic rules language.
