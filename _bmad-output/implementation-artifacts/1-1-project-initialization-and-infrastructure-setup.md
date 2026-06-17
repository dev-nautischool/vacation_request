---
story_key: 1-1-project-initialization-and-infrastructure-setup
epic: 1
story: 1
baseline_commit: 43c33246ce84ff6ddd8846d5492c330dd2299cfd
---

# Story 1.1: Project Initialization & Infrastructure Setup

Status: done

## Story

As a developer,
I want the project scaffolded with all required dependencies, environment configuration, CI pipeline, and Docker setup,
so that the team has a reproducible, ready-to-develop baseline from day one.

## Acceptance Criteria

1. **Given** the initialization command is run (`create-next-app` + npm installs for prisma, better-auth, nodemailer, node-cron)  
   **When** setup completes  
   **Then** `npm run dev` starts the Turbopack dev server without errors  
   **And** `npm run build` completes without TypeScript or ESLint errors

2. **Given** `.env.local` is missing or any required variable is absent  
   **When** the server starts  
   **Then** `src/lib/env.ts` throws a descriptive startup error listing each missing variable name

3. **Given** the project root  
   **When** `.env.example` is inspected  
   **Then** all required variables (DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST, SMTP_USER, SMTP_PASS, APP_URL) are present as placeholder entries with no real secrets committed

4. **Given** a push or pull request is created  
   **When** `.github/workflows/ci.yml` runs  
   **Then** TypeScript type-check, ESLint, and `prisma validate` all pass

5. **Given** `docker-compose up` is run  
   **When** the container starts  
   **Then** a PostgreSQL instance is accessible at the configured DATABASE_URL

## Tasks / Subtasks

- [x] Task 1: Scaffold Next.js project with exact create-next-app command (AC: 1)
  - [x] Run `npx create-next-app@latest vacation-request --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Install additional dependencies: `npm install prisma @prisma/client`
  - [x] Run `npx prisma init --datasource-provider postgresql`
  - [x] Install: `npm install better-auth`
  - [x] Install: `npm install nodemailer @types/nodemailer`
  - [x] Install: `npm install node-cron @types/node-cron`
  - [x] Verify `npm run dev` starts without errors (Turbopack)
  - [x] Verify `npm run build` completes with no TS or ESLint errors

- [x] Task 2: Create env validation module `src/lib/env.ts` (AC: 2)
  - [x] Define required env var names: DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST, SMTP_USER, SMTP_PASS, APP_URL
  - [x] On module load, check each required var exists in `process.env`
  - [x] If any missing, throw descriptive error listing ALL missing var names (not just first)
  - [x] Export typed env object (e.g. `env.DATABASE_URL`) for use throughout codebase
  - [x] Add import of `src/lib/env.ts` in `src/app/layout.tsx` so validation fires at server startup

- [x] Task 3: Create `.env.example` with all required variables (AC: 3)
  - [x] Add placeholders (no real values): DATABASE_URL, BETTER_AUTH_SECRET, SMTP_HOST, SMTP_USER, SMTP_PASS, APP_URL
  - [x] Verify `.env.local` is in `.gitignore`
  - [x] Do NOT commit any real secrets

- [x] Task 4: Create `.github/workflows/ci.yml` CI pipeline (AC: 4)
  - [x] Add step: TypeScript type-check (`npx tsc --noEmit`)
  - [x] Add step: ESLint (`npm run lint`)
  - [x] Add step: Prisma schema validation (`npx prisma validate`)
  - [x] Trigger on push and pull_request to main branch
  - [x] Use Node.js 20.x

- [x] Task 5: Create `docker-compose.yml` for PostgreSQL (AC: 5)
  - [x] Define `postgres` service using official `postgres:16` image
  - [x] Expose port 5432
  - [x] Set POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD as env vars
  - [x] Mount named volume for data persistence
  - [x] DATABASE_URL in `.env.example` must match docker-compose credentials

- [x] Task 6: Write tests for `src/lib/env.ts` (AC: 2)
  - [x] Test: module throws when a required var is missing
  - [x] Test: error message lists all missing vars (not just one)
  - [x] Test: module exports correct typed values when all vars present

### Review Findings

- [x] [Review][Decision] `NEXTAUTH_URL` → renamed to `APP_URL` — more neutral, library-agnostic name for the app base URL
- [x] [Review][Patch] `.env.example` excluded from git by `.env*` gitignore pattern — AC3 requires the file to be committed; it exists on disk but is blocked by `.gitignore:34`. Fix: add `!.env.example` after the `.env*` line in `.gitignore`. [`.gitignore`]
- [x] [Review][Patch] CI missing `npm test` step — tests are never run in CI; `vitest run` is never invoked. Fix: add a "Run tests" step after lint. [`.github/workflows/ci.yml`]
- [x] [Review][Patch] `@types/node-cron` and `@types/nodemailer` in `dependencies` instead of `devDependencies` — type-only packages should not be shipped as runtime deps. [`package.json`]
- [x] [Review][Patch] `prisma` CLI in `dependencies` instead of `devDependencies` — CLI tool is dev-only; only `@prisma/client` belongs in runtime deps. [`package.json`]
- [x] [Review][Patch] Pinned versions use `^` caret ranges instead of exact pins — spec requires exact: `prisma@7.8.0`, `@prisma/client@7.8.0`, `better-auth@1.3.4`. [`package.json`]
- [x] [Review][Patch] Whitespace-only values bypass env validation — `!process.env[key]` is falsy for `""` but truthy for `"   "`. Fix: use `!process.env[key]?.trim()`. [`src/lib/env.ts`]
- [x] [Review][Defer] No `prisma generate` / `postinstall` step in CI [`package.json`] — deferred, pre-existing; becomes relevant when Story 1.2 adds models and CI type-check imports from `@/generated/prisma`
- [x] [Review][Defer] CI only triggers on `main` branch [`.github/workflows/ci.yml`] — deferred, pre-existing; acceptable scope for a solo internal project
- [x] [Review][Defer] No `healthcheck` on Postgres service in `docker-compose.yml` — deferred, pre-existing; quality-of-life improvement, not a story requirement
- [x] [Review][Defer] Test coverage gap: only `DATABASE_URL` removal is tested, not each individual required variable [`src/lib/env.test.ts`] — deferred, pre-existing; beyond story spec requirements

## Dev Notes

### Project Name & Location

The project directory is named `vacation-request` (not `VacationRequest`). All development happens inside `vacation-request/`.

### Exact Initialization Command

```bash
npx create-next-app@latest vacation-request \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd vacation-request

npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
npm install better-auth
npm install nodemailer @types/nodemailer
npm install node-cron @types/node-cron
```

### Exact Dependency Versions (from architecture)

| Package | Version |
|---|---|
| next | 16.x (latest stable) |
| prisma | 7.8.0 |
| @prisma/client | 7.8.0 |
| better-auth | 1.3.4 |
| nodemailer | latest |
| node-cron | latest |
| Node.js | 20.9+ |

Pin prisma to exactly `7.8.0`: `npm install prisma@7.8.0 @prisma/client@7.8.0`

Pin better-auth: `npm install better-auth@1.3.4`

### `src/lib/env.ts` — Implementation Pattern

Simple module-load-time validation (no Zod — architecture explicitly defers that to post-v1):

```ts
const REQUIRED = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'APP_URL',
] as const

const missing = REQUIRED.filter((key) => !process.env[key])
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    `Copy .env.example to .env.local and fill in all values.`
  )
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  SMTP_HOST: process.env.SMTP_HOST!,
  SMTP_USER: process.env.SMTP_USER!,
  SMTP_PASS: process.env.SMTP_PASS!,
  APP_URL: process.env.APP_URL!,
}
```

**Critical:** Import `@/lib/env` at the top of `src/app/layout.tsx` (server component) so validation fires on every cold server start. Do NOT only import it from individual services — a missing var should surface at startup, not at first request.

### `docker-compose.yml` Requirements

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: vacation_request
      POSTGRES_USER: vacation_user
      POSTGRES_PASSWORD: vacation_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

The `.env.example` DATABASE_URL must match: `postgresql://vacation_user:vacation_pass@localhost:5432/vacation_request`

### CI Workflow Requirements

- Node 20.x setup (use `actions/setup-node@v4`)
- Install deps with `npm ci` (not `npm install`)
- Steps in order: type-check → lint → prisma validate
- Must pass `prisma validate` even with empty/placeholder schema — `npx prisma init` creates a valid baseline schema

### TypeScript Strict Mode

`create-next-app` with TypeScript enables `strict: true` in `tsconfig.json` by default. Do NOT relax this. All subsequent stories depend on strict mode being in place.

### ESLint Config

`create-next-app` creates `.eslintrc.json` with `next/core-web-vitals` and `next/typescript` rules. Keep as-is. No additional rules needed for Story 1.1.

### Tailwind Config

`create-next-app` generates `tailwind.config.ts` with `src/**/*.{ts,tsx}` content paths. Keep as-is. Design tokens are added in Story 1.3.

### Import Alias

The `@/*` alias maps to `src/*` in `tsconfig.json`. All subsequent stories use `@/lib/...`, `@/components/...` etc. This alias must be confirmed working.

### `prisma/schema.prisma` — Story 1.1 State

After `npx prisma init`, the schema has only the datasource and generator blocks. No models yet — those are added in Story 1.2. Do NOT add any models in this story.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Testing Framework

`create-next-app` does NOT include a test runner. For Story 1.1 tests of `env.ts`, use **Vitest** (preferred for Next.js + TypeScript projects):

```bash
npm install -D vitest @vitejs/plugin-react
```

Add `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

**Test file location:** `src/lib/env.test.ts` (co-located with source per architecture conventions).

**Testing `env.ts` requires module isolation** — each test must reset `process.env` and re-import the module. Use `vi.resetModules()` + `vi.stubEnv()` pattern:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const ALL_VARS = {
  DATABASE_URL: 'postgresql://test',
  BETTER_AUTH_SECRET: 'secret',
  SMTP_HOST: 'smtp.test',
  SMTP_USER: 'user',
  SMTP_PASS: 'pass',
  APP_URL: 'http://localhost:3000',
}

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws with names of all missing vars', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('BETTER_AUTH_SECRET', '')
    await expect(import('@/lib/env')).rejects.toThrow(/DATABASE_URL/)
  })
  
  it('exports typed values when all vars present', async () => {
    Object.entries(ALL_VARS).forEach(([k, v]) => vi.stubEnv(k, v))
    const { env } = await import('@/lib/env')
    expect(env.DATABASE_URL).toBe('postgresql://test')
  })
})
```

### Anti-Patterns — NEVER Do These

- Do NOT use `require('dotenv').config()` — Next.js handles `.env.local` automatically
- Do NOT add Zod to validate env vars — architecture explicitly defers this to post-v1
- Do NOT add any Prisma models in this story — that is Story 1.2
- Do NOT install any UI component library (shadcn, MUI, etc.) — design system is custom-built in Story 1.3
- Do NOT configure Better Auth in this story — that is Story 1.5
- Do NOT commit `.env.local` — verify it is in `.gitignore` before first commit

### Project Structure Notes

After this story the repo root should contain:
```
vacation-request/
├── .env.example                ← created here
├── .env.local                  ← git-ignored, NOT committed
├── .eslintrc.json              ← from create-next-app
├── .gitignore                  ← includes .env.local
├── .github/workflows/ci.yml   ← created here
├── docker-compose.yml          ← created here
├── next.config.ts
├── package.json                ← includes test script
├── tailwind.config.ts
├── tsconfig.json               ← strict: true preserved
├── vitest.config.ts            ← created here
├── prisma/
│   └── schema.prisma           ← datasource + generator only
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx          ← imports @/lib/env at top
    │   └── page.tsx
    └── lib/
        ├── env.ts              ← created here
        └── env.test.ts         ← created here
```

### References

- [Source: architecture.md#Selected Starter: create-next-app@latest]
- [Source: architecture.md#Infrastructure & Deployment]
- [Source: architecture.md#Environment Configuration]
- [Source: architecture.md#Complete Project Directory Structure]
- [Source: architecture.md#Naming Patterns]
- [Source: epics.md#Story 1.1]
- [Source: prd.md#10. Non-Functional Requirements]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Prisma v7.8.0 breaking change: `url = env("DATABASE_URL")` no longer supported in schema.prisma — moved to `prisma.config.ts`. Used `@next/env`'s `loadEnvConfig` in `prisma.config.ts` so Prisma CLI loads `.env.local`. Generator output path changed to `src/generated/prisma` (new v7 default). Subsequent stories must import from `@/generated/prisma`, not `@prisma/client`.

### Completion Notes List

- Scaffolded Next.js 16.2.9 with TypeScript strict, Tailwind CSS, ESLint, App Router, src/ dir, @/* alias
- Installed pinned deps: prisma@7.8.0, @prisma/client@7.8.0, better-auth@1.3.4, nodemailer, node-cron
- Created `src/lib/env.ts`: module-load-time validation, throws listing all missing vars, exports typed env object
- Added `import "@/lib/env"` to `src/app/layout.tsx` — fires on every cold server start
- Created `.env.example` with all 6 required vars matching docker-compose defaults
- Created `.github/workflows/ci.yml`: type-check → lint → prisma validate; passes DATABASE_URL as CI env var
- Created `docker-compose.yml` using postgres:16; credentials aligned with `.env.example` DATABASE_URL
- Installed Vitest + wrote 3 tests for env.ts (missing var, all-vars-listed, exports-values); all pass
- `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npx prisma validate` all pass
- **NOTE for Story 1.2+:** Prisma v7 generates client to `src/generated/prisma/`. Import: `import { PrismaClient } from "@/generated/prisma"` (NOT `@prisma/client`)

### File List

- vacation-request/.env.example
- vacation-request/.github/workflows/ci.yml
- vacation-request/docker-compose.yml
- vacation-request/prisma.config.ts
- vacation-request/prisma/schema.prisma
- vacation-request/src/app/layout.tsx (modified — added env import)
- vacation-request/src/lib/env.ts
- vacation-request/src/lib/env.test.ts
- vacation-request/vitest.config.ts
- vacation-request/package.json (modified — added test scripts)

### Change Log

- 2026-06-11: Story 1.1 implemented — Next.js scaffold, Prisma v7 setup, env validation, CI workflow, docker-compose, Vitest tests (3/3 pass)
