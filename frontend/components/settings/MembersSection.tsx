"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchMembers as fetchMembersApi, inviteMember, removeMember } from "@/services/organizations"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus, Trash2, Loader2 } from "lucide-react"
import type { MembersResponse } from "@/types"
import InvitationsSection from "./InvitationsSection"

interface MembersSectionProps {
  orgId: string
}

export default function MembersSection({ orgId }: MembersSectionProps) {
  const { user } = useAuth()
  const [data, setData] = useState<MembersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchMembersApi(orgId)
      setData(res)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      await inviteMember(orgId, { email: inviteEmail, role: inviteRole })
      setInviteEmail("")
      setDialogOpen(false)
      fetchMembers()
    } catch (err) {
      console.error("Failed to invite:", err)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm("Retirer ce membre de l'organisation ?")) return
    try {
      await removeMember(orgId, userId)
      fetchMembers()
    } catch (err) {
      console.error("Failed to remove:", err)
    }
  }

  const currentUserRole = data?.members.find(
    (m) => m.user_id === user?.id
  )?.role

  const isOwner = currentUserRole === "owner"

  const invitations = data?.invitations ?? []

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl tracking-tight">
            Membres ({data?.members.length ?? 0})
          </h2>
        </div>
        {(isOwner || currentUserRole === "admin") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm">
                <UserPlus className="h-4 w-4" />
                Inviter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 font-[family-name:var(--font-body)]">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="membre@exemple.com"
                    required
                    className="h-11 bg-secondary/30 border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rôle</Label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Envoyer l&apos;invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 font-[family-name:var(--font-body)]">
              {data?.members.map((member) => {
                const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase()
                return (
                  <div key={member.user_id} className="flex items-center gap-3 rounded-xl border border-border p-3.5 hover:bg-secondary/20 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/8 text-primary text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant={member.role === "owner" ? "default" : "secondary"} className="text-[10px] font-normal">
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemove(member.user_id)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <InvitationsSection invitations={invitations} />
      )}
    </>
  )
}

