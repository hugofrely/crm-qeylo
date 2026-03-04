"use client"

import { useAuth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Settings,
  User,
  Mail,
  ChevronRight,
  Kanban,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function SettingsPage() {
  const { user } = useAuth()

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Param&egrave;tres
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          G&eacute;rez votre profil et votre configuration
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">
                {user?.first_name} {user?.last_name}
              </h2>
              <Badge variant="secondary" className="mt-1">
                Utilisateur
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Nom complet</p>
                <p className="text-sm font-medium">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Adresse email</p>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline settings link */}
      <Card>
        <CardContent className="p-0">
          <Link href="/settings/pipeline">
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-4 px-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Kanban className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Pipeline</p>
                  <p className="text-xs text-muted-foreground">
                    Personnaliser les &eacute;tapes du pipeline
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
