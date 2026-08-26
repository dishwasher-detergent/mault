## Summary

<!-- What does this change do, and why? -->

## Type of change

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Style / UI polish
- [ ] Performance
- [ ] Docs / other

## Area

<!-- Which feature(s) under packages/web/src/features/ does this touch? -->

## Checklist

- [ ] `pnpm --filter @magic-vault/web lint` passes
- [ ] `pnpm --filter @magic-vault/web build` passes (`tsc -b && vite build`)
- [ ] Manually tested the golden path in the browser
- [ ] Manually tested relevant edge cases (empty/loading/error states, mobile layout if applicable)
- [ ] New/changed forms use React Hook Form + a Zod resolver, not manual `useState`
- [ ] New user-facing strings added to all locales under `src/locales/` (`en`, `de`, `fr`)
- [ ] No source-specific card fields (e.g. Scryfall's `prices.usd`) hardcoded outside adapter-aware code — resolved via `Game.fieldDefinitions`/`getByPath` instead

## Screenshots / recording

<!-- Before/after for any visual change -->

## Related issue

<!-- Closes #... -->
