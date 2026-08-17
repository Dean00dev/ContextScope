# Contributing

ContextScope's most important rule is simple: **do not invent agent semantics**.

A new or changed profile must cite primary product documentation or executable upstream behaviour and include a regression fixture. When product behaviour cannot be reconstructed deterministically, preserve that uncertainty in the output.

## Development

```bash
npm run verify
```

Node.js 20+ is supported. Runtime dependencies should remain at zero unless a dependency clearly improves correctness enough to justify the supply-chain and installation cost.

## Pull requests

Please include:

- the user-visible behaviour being changed;
- primary documentation or upstream code that supports the semantics;
- tests for precedence, missing data and negative cases;
- any new uncertainty/limitation introduced by the change.
