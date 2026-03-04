"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Building2, UserPlus, Trash2, Loader2 } from "lucide-react"

interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  joined_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface MembersResponse {
  members: Member[]
  invitations: PendingInvitation[]
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<MembersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Get org id
  useEffect(() => {
    async function fetchOrg() {
      try {
        const orgs = await apiFetch<{ id: string; name: string }[]>("/organizations/")
        if (orgs.length > 0) setOrgId(orgs[0].id)
      } catch {
        // silently fail
      }
    }
    fetchOrg()
  }, [])

  const fetchMembers = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await apiFetch<MembersResponse>(`/organizations/${orgId}/members/`)
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
    if (!orgId) return
    setInviting(true)
    try {
      await apiFetch(`/organizations/${orgId}/invite/`, {
        method: "POST",
        json: { email: inviteEmail, role: inviteRole },
      })
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
    if (!orgId) return
    if (!confirm("Retirer ce membre de l'organisation ?")) return
    try {
      await apiFetch(`/organizations/${orgId}/members/${userId}/remove/`, {
        method: "DELETE",
      })
      fetchMembers()
    } catch (err) {
      console.error("Failed to remove:", err)
    }
  }

  const currentUserRole = data?.members.find(
    (m) => m.user_id === user?.id
  )?.role

  const isOwner = currentUserRole === "owner"

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Organisation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les membres de votre organisation
          </p>
        </div>
        {(isOwner || currentUserRole === "admin") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="membre@exemple.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
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

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Membres ({data?.members.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {data?.members.map((member) => {
                const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase()
                return (
                  <div key={member.user_id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member.user_id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {data?.invitations && data.invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Invitations en attente ({data.invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Rôle : {inv.role} · Envoyée le{" "}
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="outline">En attente</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
