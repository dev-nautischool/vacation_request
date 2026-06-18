import type { RequestStatus, Role } from "@/generated/prisma/enums"

export type ActorRole = Role | "FALLBACK"

const TRANSITIONS: Partial<Record<RequestStatus, Partial<Record<RequestStatus, ActorRole[]>>>> = {
  DRAFT: { PENDING: ["TRAINER"] },
  PENDING: {
    APPROVED: ["SUPERVISOR", "FALLBACK"],
    REJECTED: ["SUPERVISOR", "FALLBACK"],
    CANCELLED: ["TRAINER"],
  },
  APPROVED: {
    CANCELLED: ["TRAINER"],
    REVOKED: ["SUPERVISOR"],
  },
}

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
  actorRole: ActorRole,
): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actorRole) ?? false
}
