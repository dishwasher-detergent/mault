## Summary

<!-- What does this change do, and why? -->

## Type of change

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Performance
- [ ] Docs / other

## Area

<!-- Which route(s)/lib module(s) under packages/server/src/ does this touch? -->

## Database migration

- [ ] N/A — no schema change
- [ ] `packages/server/src/db/schema.ts` updated
- [ ] Migration generated via `pnpm --filter @magic-vault/server db:generate` (not hand-edited under `drizzle/`)
- [ ] Generated SQL reviewed by hand (especially renames, which Drizzle can see as drop+add)
- [ ] Migration applied and tested locally via `pnpm --filter @magic-vault/server db:migrate`
- [ ] New tables holding user/org data follow the existing `.enableRLS()` + `crudPolicy({ role: authenticatedRole, ... })` pattern
- [ ] `schema.ts` and the generated `drizzle/*.sql` + `drizzle/meta/*` files are committed together in this PR

## Auth / RLS

- [ ] New/changed routes use `authQuery(jwtClaims, tx => ...)` for anything scoped to the calling user/org
- [ ] `db` (RLS-bypassing) is only used where that's intentional (background jobs, webhook lookups, `neon_auth.*` bootstrap)
- [ ] New routes registered without an `/api` prefix (matches the Vite dev proxy rewrite)

## Checklist

- [ ] `pnpm --filter @magic-vault/server build` (tsup) passes
- [ ] Editor/IDE shows no TypeScript diagnostics for changed files (no lint script for this package)
- [ ] Manually exercised the endpoint(s) (curl/Thunder Client/UI) against a real Neon database

## Related issue

<!-- Closes #... -->
