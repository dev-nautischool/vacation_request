import { describe, it, expect, beforeEach, vi } from "vitest"

const ALL_VARS = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  BETTER_AUTH_SECRET: "supersecretvalue",
  SMTP_HOST: "smtp.example.com",
  SMTP_USER: "user@example.com",
  SMTP_PASS: "smtppassword",
  APP_URL: "http://localhost:3000",
}

describe("env validation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("throws when a required variable is missing", async () => {
    // Set all vars except DATABASE_URL
    Object.entries(ALL_VARS)
      .filter(([k]) => k !== "DATABASE_URL")
      .forEach(([k, v]) => vi.stubEnv(k, v))
    vi.stubEnv("DATABASE_URL", "")

    await expect(import("@/lib/env")).rejects.toThrow(
      /Missing required environment variables/,
    )
  })

  it("error message lists ALL missing variable names", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("BETTER_AUTH_SECRET", "")

    await expect(import("@/lib/env")).rejects.toThrow(
      /DATABASE_URL.*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET.*DATABASE_URL/,
    )
  })

  it("exports typed values when all required vars are present", async () => {
    Object.entries(ALL_VARS).forEach(([k, v]) => vi.stubEnv(k, v))

    const { env } = await import("@/lib/env")

    expect(env.DATABASE_URL).toBe(ALL_VARS.DATABASE_URL)
    expect(env.BETTER_AUTH_SECRET).toBe(ALL_VARS.BETTER_AUTH_SECRET)
    expect(env.SMTP_HOST).toBe(ALL_VARS.SMTP_HOST)
    expect(env.SMTP_USER).toBe(ALL_VARS.SMTP_USER)
    expect(env.SMTP_PASS).toBe(ALL_VARS.SMTP_PASS)
    expect(env.APP_URL).toBe(ALL_VARS.APP_URL)
  })
})
