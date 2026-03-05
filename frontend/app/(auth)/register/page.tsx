"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

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
        organization_name: organizationName,
      })
      router.push("/chat")
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message)
          const messages: string[] = []
          if (parsed.email) messages.push(`Email: ${parsed.email.join(", ")}`)
          if (parsed.password)
            messages.push(`Mot de passe: ${parsed.password.join(", ")}`)
          if (parsed.organization_name)
            messages.push(`Organisation: ${parsed.organization_name.join(", ")}`)
          if (parsed.detail) messages.push(parsed.detail)
          if (parsed.non_field_errors)
            messages.push(parsed.non_field_errors.join(", "))
          setError(
            messages.length > 0
              ? messages.join(" ")
              : "Erreur lors de la création du compte."
          )
        } catch {
          setError("Erreur lors de la création du compte.")
        }
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.")
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
        <h2 className="text-3xl tracking-tight">Créer un compte</h2>
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Inscrivez-vous pour commencer à utiliser Qeylo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive font-[family-name:var(--font-body)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
              Prénom
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Jean"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
              Nom
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizationName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Nom de votre organisation
          </Label>
          <Input
            id="organizationName"
            type="text"
            placeholder="Mon entreprise"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Mot de passe
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 8 caractères"
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
              Création...
            </>
          ) : (
            "Créer un compte"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
