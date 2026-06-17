import { verifyPassword, hashPassword } from "better-auth/crypto"
import { PrismaClient } from "./src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: "postgresql://vacation_user:vacation_pass@localhost:5432/vacation_request" })
const prisma = new PrismaClient({ adapter })

const account = await prisma.account.findFirst({ where: { providerId: "credential" } })
const seededHash = account?.password ?? ""
console.log("Seeded hash length:", seededHash.length)
console.log("Seeded hash:", seededHash.substring(0, 100))

const baHash = await hashPassword("Admin1234!")
console.log("\nBetter-auth hash length:", baHash.length)
console.log("Better-auth hash:", baHash.substring(0, 100))

const verified = await verifyPassword({ hash: seededHash, password: "Admin1234!" })
console.log("\nSeeded hash verifies with better-auth:", verified)
