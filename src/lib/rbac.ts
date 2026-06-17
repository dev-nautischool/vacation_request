import type { Role } from "@/generated/prisma/enums"

export type Actor = { id: string; role: Role }

export type Action =
  | "SUBMIT_REQUEST"
  | "SAVE_DRAFT"
  | "CANCEL_REQUEST"
  | "APPROVE_REQUEST"
  | "REJECT_REQUEST"
  | "REVOKE_REQUEST"
  | "SET_ENTITLEMENT"
  | "MANAGE_USERS"
  | "CONFIGURE_FALLBACK"

const TRAINER_ACTIONS: Action[] = ["SUBMIT_REQUEST", "SAVE_DRAFT", "CANCEL_REQUEST"]
const SUPERVISOR_ACTIONS: Action[] = [
  "APPROVE_REQUEST",
  "REJECT_REQUEST",
  "REVOKE_REQUEST",
  "SET_ENTITLEMENT",
  "MANAGE_USERS",
  "CONFIGURE_FALLBACK",
]

export function canActorPerformAction(
  actor: Actor,
  action: Action,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _resource?: unknown,
): boolean {
  if (actor.role === "TRAINER") return TRAINER_ACTIONS.includes(action)
  if (actor.role === "SUPERVISOR") return SUPERVISOR_ACTIONS.includes(action)
  return false
}
