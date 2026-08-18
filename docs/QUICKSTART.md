# ContextScope quickstart

Get a useful answer from ContextScope in under five minutes.

## 1. Run it without installing globally

From the root of a repository:

```bash
npx --yes github:Dean00dev/ContextScope doctor
```

ContextScope is offline and makes no model/API calls.

## 2. See what one agent receives

Pick a real source path and an agent:

```bash
npx --yes github:Dean00dev/ContextScope explain src/auth/login.ts --agent codex
```

Supported agents are `codex`, `claude`, `copilot`, `cursor`, and `gemini`.

The output shows the repository instruction sources ContextScope can reconstruct, their order, approximate context size, and a certainty label. `partial` and `conditional` are intentional: ContextScope does not turn undocumented or runtime-dependent behaviour into fake certainty.

## 3. Compare all supported agents

```bash
npx --yes github:Dean00dev/ContextScope matrix src/auth/login.ts
```

This is the fastest way to spot instruction drift. If two agents see different repository instruction surfaces for the same path, the matrix makes it visible.

## 4. Diff two agents

```bash
npx --yes github:Dean00dev/ContextScope diff src/auth/login.ts --agent codex --agent claude
```

The diff is deliberately textual. Different wording is not silently declared semantically equivalent.

## 5. Scan the whole repository

```bash
npx --yes github:Dean00dev/ContextScope scan
```

For CI:

```bash
npx --yes github:Dean00dev/ContextScope scan --format sarif --output contextscope.sarif --fail-on-warning
```

The scanner can flag missing repository-local references, references escaping the repository, duplicated exact instruction lines, and multi-agent instruction surfaces.

## 6. Add the GitHub Action

```yaml
name: ContextScope
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  contextscope:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Dean00dev/ContextScope@v0.2.0
        with:
          fail_on_warning: false
```

## What a green result means

A green ContextScope result means its bounded static checks completed successfully. It is not a claim that an agent obeyed the instructions, that hidden prompts were inspected, or that the repository is safe.

For exact semantics and limitations, read [SEMANTICS.md](SEMANTICS.md).
