# Threat model

ContextScope reads repository text and emits static reports. It does not execute repository instruction files and does not call a model.

## Trusted boundary

The CLI itself and its Node.js runtime are trusted. Repository contents are untrusted input.

## Defences

- analysis targets must remain inside the Git repository;
- repository-local `@` references are resolved as files, never executed;
- references leaving the repository are reported rather than followed;
- no shell command is constructed from repository content;
- reports do not contain environment variables or model/API credentials;
- no network calls are made by ContextScope at runtime.

## Residual risks

- very large repositories/instruction files can consume memory or time;
- repository-local references are canonicalized with `realpath`; references resolving through symlinks outside the repository are rejected;
- product discovery rules can change upstream, so stale profile semantics are a correctness risk until documentation/tests are updated;
- terminal output may contain repository-controlled text in future richer renderers, so ANSI-stripping should be considered before echoing arbitrary instruction content;
- “no model calls” does not make downstream GitHub workflows safe if they execute unrelated repository commands.

## Security reporting

Please open a private GitHub security advisory for vulnerabilities that would allow path escape, unintended code execution, secret disclosure, or unsafe GitHub Action behaviour.
