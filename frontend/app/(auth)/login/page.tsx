"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
      router.push("/chat")
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message)
          setError(
            parsed.detail ||
              parsed.non_field_errors?.[0] ||
              "Email ou mot de passe incorrect."
          )
        } catch {
          setError("Email ou mot de passe incorrect.")
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
        <h2 className="text-3xl tracking-tight">Connexion</h2>
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Connectez-vous pour accéder à votre CRM
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive font-[family-name:var(--font-body)]">
            {error}
          </div>
        )}

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
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
              Connexion...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-foreground font-medium underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
