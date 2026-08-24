## Summary

<!-- What does this change do, and why? -->

## Type of change

- [ ] New type / interface
- [ ] New constant
- [ ] `evaluate-bin` rule engine change
- [ ] Fix
- [ ] Refactor

## Checklist

- [ ] No server-only (Node/Drizzle) or web-only (React/DOM) dependencies introduced — `@magic-vault/shared` stays framework-agnostic
- [ ] `packages/server` still builds after the change (`pnpm --filter @magic-vault/server build`)
- [ ] `packages/web` still builds after the change (`pnpm --filter @magic-vault/web build`)
- [ ] Both consumers checked for call sites affected by the change (no build step here means nothing catches a stale usage until a consumer compiles)

## Related issue

<!-- Closes #... -->
