"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import type { ActionResult } from "@/types"

const ROLE_COOKIE = "user-role"
const ROLE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // 30 days — matches Better Auth session expiry
  maxAge: 60 * 60 * 24 * 30,
}

export async function login(
  _prevState: ActionResult<{ redirectTo: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const email = (formData.get("email") as string | null)?.trim() ?? ""
  const password = (formData.get("password") as string | null) ?? ""
  const returnTo = (formData.get("returnTo") as string | null) ?? ""

  const safeRedirect =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard"

  const requestHeaders = await headers()

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
    })
  } catch {
    return {
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    }
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { deletedAt: true, role: true },
  })

  if (!user || user.deletedAt) {
    await auth.api.signOut({ headers: requestHeaders }).catch(() => {})
    const jar = await cookies()
    jar.delete(ROLE_COOKIE)
    return {
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    }
  }

  const jar = await cookies()
  jar.set(ROLE_COOKIE, user.role, ROLE_COOKIE_OPTIONS)

  return { success: true, data: { redirectTo: safeRedirect } }
}

export async function logout(): Promise<void> {
  const requestHeaders = await headers()
  await auth.api.signOut({ headers: requestHeaders })
  const jar = await cookies()
  jar.delete(ROLE_COOKIE)
  redirect("/login")
}
