import type { Role } from "@/generated/prisma/enums"

export interface NavItem {
  label: string
  href: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",      roles: ["TRAINER", "SUPERVISOR"] },
  { label: "My Requests",  href: "/requests",       roles: ["TRAINER"] },
  { label: "Approvals",    href: "/approvals",      roles: ["SUPERVISOR"] },
  { label: "Trainers",     href: "/trainers",       roles: ["SUPERVISOR"] },
  { label: "Users",        href: "/users",          roles: ["SUPERVISOR"] },
  { label: "Notifications",href: "/notifications",  roles: ["TRAINER", "SUPERVISOR"] },
]

export function getNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
