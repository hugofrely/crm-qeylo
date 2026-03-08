"use client"

import { useState, useEffect, FormEvent, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"

function RegisterForm() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite") || ""
  const inviteEmail = searchParams.get("email") || ""

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [inviteOrgName, setInviteOrgName] = useState("")
  const { register } = useAuth()
  const router = useRouter()
  const t = useTranslations("auth")

  // Pre-fill email from invite
  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail)
  }, [inviteEmail])

  // Fetch org name from invite token
  useEffect(() => {
    if (inviteToken) {
      apiFetch<{ email: string; organization_name: string }>(
        `/invite/accept/${inviteToken}/`,
        { method: "GET" }
      )
        .then((data) => setInviteOrgName(data.organization_name))
        .catch(() => {})
    }
  }, [inviteToken])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        organization_name: inviteToken ? "" : organizationName,
        invite_token: inviteToken || undefined,
      })
      router.push("/chat")
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message)
          const messages: string[] = []
          if (parsed.email) messages.push(`${t("errors.emailPrefix")}: ${parsed.email.join(", ")}`)
          if (parsed.password)
            messages.push(`${t("errors.passwordPrefix")}: ${parsed.password.join(", ")}`)
          if (parsed.organization_name)
            messages.push(`${t("errors.organizationPrefix")}: ${parsed.organization_name.join(", ")}`)
          if (parsed.detail) messages.push(parsed.detail)
          if (parsed.non_field_errors)
            messages.push(parsed.non_field_errors.join(", "))
          setError(
            messages.length > 0
              ? messages.join(" ")
              : t("errors.registrationError")
          )
        } catch {
          setError(t("errors.registrationError"))
        }
      } else {
        setError(t("errors.genericError"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="animate-fade-in-up">
      {/* Mobile logo */}
      <div className="lg:hidden mb-8 text-center">
        <h1 className="text-3xl tracking-tight">Qeylo</h1>
      </div>

      <div className="space-y-2 mb-8">
        <h2 className="text-3xl tracking-tight">{t("register.title")}</h2>
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          {t("register.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive font-[family-name:var(--font-body)]">
            {error}
          </div>
        )}

        {inviteOrgName && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm font-[family-name:var(--font-body)]">
            {t("register.joiningOrganization")} <span className="font-semibold">{inviteOrgName}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
              {t("register.firstName")}
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder={t("register.firstNamePlaceholder")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
              {t("register.lastName")}
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder={t("register.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
            />
          </div>
        </div>

        {!inviteToken && (
          <div className="space-y-2">
            <Label htmlFor="organizationName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
              {t("register.organizationName")}
            </Label>
            <Input
              id="organizationName"
              type="text"
              placeholder={t("register.organizationNamePlaceholder")}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            {t("register.email")}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t("register.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!inviteToken}
            disabled={isLoading}
            className={`h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors ${inviteToken ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            {t("register.password")}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={t("register.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isLoading}
            className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-sm font-medium tracking-wide"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("register.submitting")}
            </>
          ) : (
            t("register.submit")
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
          {t("register.alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
          >
            {t("register.signIn")}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
