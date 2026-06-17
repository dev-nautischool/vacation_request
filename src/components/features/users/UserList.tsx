"use client"

import { useActionState, useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button, Modal, useToast } from "@/components/ui"
import { removeUser, assignSupervisor } from "@/lib/actions/users"
import type { ActionResult } from "@/types"
import type { Role, User } from "@/generated/prisma/client"

interface SupervisorOption {
  id: string
  name: string
}

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  supervisorId: string | null
  supervisor: { id: string; name: string } | null
}

interface UserListProps {
  users: UserRow[]
  supervisors: SupervisorOption[]
}

const roleLabel: Record<Role, string> = {
  TRAINER: "Trainer",
  SUPERVISOR: "Supervisor",
}

const roleStyles: Record<Role, string> = {
  TRAINER:
    "border-2 border-[var(--color-status-pending)] text-[var(--color-status-pending)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]",
  SUPERVISOR:
    "border-2 border-[var(--color-status-approved)] text-[var(--color-status-approved)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]",
}

function AssignSupervisorSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Saving…" : "Assign"}
    </Button>
  )
}

function AssignSupervisorForm({
  trainerId,
  supervisors,
  currentSupervisorId,
}: {
  trainerId: string
  supervisors: SupervisorOption[]
  currentSupervisorId: string | null
}) {
  const [state, action] = useActionState<ActionResult<User> | null, FormData>(
    assignSupervisor,
    null,
  )
  const { toast } = useToast()

  useEffect(() => {
    if (!state) return
    if (state.success) toast("Supervisor assigned.", "success")
    else toast(state.error, "error")
  }, [state, toast])

  if (supervisors.length === 0) {
    return (
      <span className="font-[var(--font-body)] text-[12px] text-[var(--color-text-secondary)] italic">
        No supervisors available
      </span>
    )
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="trainerId" value={trainerId} />
      <select
        name="supervisorId"
        defaultValue={currentSupervisorId ?? ""}
        className="h-9 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-[var(--font-body)] text-[13px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
      >
        {!currentSupervisorId && (
          <option value="" disabled>
            Select supervisor
          </option>
        )}
        {supervisors.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <AssignSupervisorSubmitButton />
    </form>
  )
}

function RemoveUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<ActionResult<void> | null, FormData>(removeUser, null)
  const { toast } = useToast()

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast(`${userName} has been removed.`, "success")
      setOpen(false)
    } else {
      toast(state.error, "error")
      setOpen(false)
    }
  }, [state, toast, userName])

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Remove
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Remove User">
        <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)] mb-6">
          Remove <strong>{userName}</strong>? This cannot be undone. Their vacation records will be
          preserved.
        </p>
        <div className="flex gap-3">
          <form action={action}>
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" variant="danger">
              Remove
            </Button>
          </form>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  )
}

export function UserList({ users, supervisors }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="border border-[var(--color-border)] p-8 text-center">
        <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-secondary)]">
          No users yet.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-[var(--color-border)] overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left px-4 py-3 font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Name
            </th>
            <th className="text-left px-4 py-3 font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Email
            </th>
            <th className="text-left px-4 py-3 font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Role
            </th>
            <th className="text-left px-4 py-3 font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Supervisor
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className={[
                "border-b border-[var(--color-border)] last:border-b-0",
                user.role === "TRAINER" && user.supervisorId === null
                  ? "bg-[color-mix(in_srgb,var(--color-status-pending)_5%,transparent)]"
                  : "",
              ].join(" ")}
            >
              <td className="px-4 py-3 font-[var(--font-body)] text-[14px] text-[var(--color-text-primary)]">
                {user.name}
              </td>
              <td className="px-4 py-3 font-[var(--font-body)] text-[14px] text-[var(--color-text-body)]">
                {user.email}
              </td>
              <td className="px-4 py-3">
                <span className={roleStyles[user.role]}>{roleLabel[user.role]}</span>
              </td>
              <td className="px-4 py-3">
                {user.role === "TRAINER" ? (
                  <div className="flex flex-col gap-2">
                    {user.supervisorId === null && (
                      <span className="border-2 border-[var(--color-status-pending)] text-[var(--color-status-pending)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em] inline-block">
                        No Supervisor
                      </span>
                    )}
                    <AssignSupervisorForm
                      trainerId={user.id}
                      supervisors={supervisors}
                      currentSupervisorId={user.supervisorId}
                    />
                  </div>
                ) : (
                  <span className="font-[var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
                    —
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <RemoveUserButton userId={user.id} userName={user.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
