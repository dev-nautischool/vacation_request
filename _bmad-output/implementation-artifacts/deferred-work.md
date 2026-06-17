# Deferred Work

## Deferred from: code review of 1-1-project-initialization-and-infrastructure-setup (2026-06-12)

- No `prisma generate` / `postinstall` step in CI — becomes relevant when Story 1.2 adds models and CI type-check must import from `src/generated/prisma`; add `"postinstall": "prisma generate"` to `package.json` or a dedicated CI step before the type-check step.
- CI only triggers on `main` branch — acceptable scope for a solo internal project; revisit if branching strategy expands.
- No `healthcheck` on Postgres service in `docker-compose.yml` — quality-of-life improvement; prevents race conditions when scripts depend on DB being ready.
- Test coverage gap: only `DATABASE_URL` removal is tested, not each individual required variable — add a parameterised test iterating all 6 vars once the test suite is stable.

## Deferred from: Story 1.3 implementation (2026-06-17)

- `src/middleware.ts` imports `auth` → `prisma` → Prisma Client, which uses `node:path` — incompatible with the Edge Runtime. Next.js 16 also warns that `middleware` is deprecated in favour of `proxy`. Fix scope: Story 1.6 (RBAC enforcement) should rewrite middleware to avoid Prisma in Edge, or migrate to the `proxy` convention per Next.js 16 docs.

## Deferred from: code review of 1-2-prisma-schema-and-database-initialization (2026-06-12)

- `prisma` CLI in `devDependencies` could break `npm ci --omit=dev` production installs — acceptable for v1 local-only; move to `dependencies` before any server deployment.
- Seed has no `NODE_ENV` guard — `prisma db seed` in production would create the default admin account; add a guard before deploying beyond local.
- `daysCount` not DB-enforced vs `startDate`/`endDate` — application-layer validation needed in Story 3.x to prevent entitlement abuse.
- `startDate >= endDate` not prevented at schema level — validate in Story 3.x request submission logic.
- Multiple concurrent active `FallbackApprover` rows per supervisor not constrained — add unique constraint or application logic in Story 4.x.
- `FallbackApprover.expiresAt` not auto-deactivating expired rows — Story 5.x scheduled job must deactivate expired fallback delegations.
- Soft-delete on `User` not enforced at query layer — future service layer stories must add global `where: { deletedAt: null }` filters.
- Overlapping-date constraint absent on `VacationRequest` — add application-level overlap check in Story 3.x request submission.
- `Verification` no `@@unique([identifier, value])` — verify better-auth handles deduplication internally before Story 1.5; add constraint if not.
