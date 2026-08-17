# ContextScope agent instructions

- Preserve ContextScope's core epistemic rule: documented behaviour beats guessed behaviour.
- Do not upgrade a profile from partial/conditional to exact without primary-source evidence and regression tests.
- Keep runtime dependencies at zero unless correctness gains clearly justify adding one.
- Run `npm run verify` after changes.
- Never add model/API calls to the default static analysis path.
