import { verifyPassword, hashPassword } from "better-auth/crypto"
import { prisma } from "./src/lib/prisma"

async function main() {
  const account = await prisma.account.findFirst({ where: { providerId: "credential" } })
  const seededHash = account?.password ?? ""
  console.log("Seeded hash length:", seededHash.length)
  console.log("Seeded hash:", seededHash.substring(0, 100))

  const baHash = await hashPassword("Admin1234!")
  console.log("\nBetter-auth hash length:", baHash.length)
  console.log("Better-auth hash:", baHash.substring(0, 100))

  const verified = await verifyPassword({ hash: seededHash, password: "Admin1234!" })
  console.log("\nSeeded hash verifies with better-auth:", verified)
}
main().catch(console.error)
