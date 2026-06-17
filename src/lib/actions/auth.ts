"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ERRORS } from "@/lib/errors"
import type { ActionResult } from "@/types"

export async function login(
  _prevState: ActionResult<{ redirectTo: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const email = (formData.get("email") as string | null)?.trim() ?? ""
  const password = (formData.get("password") as string | null) ?? ""
  const returnTo = (formData.get("returnTo") as string | null) ?? ""

  const safeRedirect =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard"

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  })

  if (!user) {
    return {
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    }
  }

  try {
    const requestHeaders = await headers()
    await auth.api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
    })
    return { success: true, data: { redirectTo: safeRedirect } }
  } catch {
    return {
      success: false,
      error: "Invalid email or password",
      code: ERRORS.UNAUTHORIZED,
    }
  }
}

export async function logout(): Promise<void> {
  const requestHeaders = await headers()
  await auth.api.signOut({ headers: requestHeaders })
  redirect("/login")
}
