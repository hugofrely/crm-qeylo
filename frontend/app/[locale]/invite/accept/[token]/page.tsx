"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations("notifications.invite")
  const [status, setStatus] = useState<"loading" | "needs_auth" | "accepted" | "error">("loading")
  const [orgName, setOrgName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (authLoading) return

    async function accept() {
      try {
        const data = await apiFetch<Record<string, unknown>>(`/invite/accept/${token}/`, {
          method: "POST",
        })
        if (data.requires_auth) {
          setOrgName(data.organization_name as string)
          setInviteEmail(data.email as string)
          setStatus("needs_auth")
        } else if (data.status === "accepted") {
          setOrgName((data.organization as Record<string, string>)?.name ?? "")
          setStatus("accepted")
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : t("invalidInvite")
        )
        setStatus("error")
      }
    }

    accept()
  }, [token, authLoading, user, t])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Qeylo</span>
            </div>
          </div>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">{t("verifying")}</p>
            </div>
          )}

          {status === "needs_auth" && (
            <>
              <CardDescription>
                {t("invitedToJoin", { orgName })}
              </CardDescription>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href={`/login?redirect=/invite/accept/${token}`}>
                    {t("login")}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/register?email=${encodeURIComponent(inviteEmail)}&invite=${token}`}>
                    {t("createAccount")}
                  </Link>
                </Button>
              </div>
            </>
          )}

          {status === "accepted" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm">
                {t("accepted", { orgName })}
              </p>
              <Button onClick={() => router.push("/chat")}>
                {t("goToChat")}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" asChild>
                <Link href="/">{t("backToHome")}</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
