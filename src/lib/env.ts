const REQUIRED = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "NEXTAUTH_URL",
] as const

const missing = REQUIRED.filter((key) => !process.env[key])
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}\n` +
      `Copy .env.example to .env.local and fill in all values.`,
  )
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  SMTP_HOST: process.env.SMTP_HOST!,
  SMTP_USER: process.env.SMTP_USER!,
  SMTP_PASS: process.env.SMTP_PASS!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
}
