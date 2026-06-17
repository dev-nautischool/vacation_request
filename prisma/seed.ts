import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import { prisma } from "../src/lib/prisma"
import { hashPassword } from "better-auth/crypto"

async function main() {
  const email = "admin@morges-natation.ch"
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!"

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      emailVerified: true,
      role: "SUPERVISOR",
    },
  })

  const hashedPassword = await hashPassword(password)

  await prisma.account.upsert({
    where: { id: `seed-${user.id}` },
    update: { password: hashedPassword },
    create: {
      id: `seed-${user.id}`,
      accountId: email,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    },
  })

  console.log(`✅ Seeded supervisor: ${email}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
