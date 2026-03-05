"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react"
import { apiFetch, setTokens, clearTokens } from "./api"
import type { User, AuthContextType } from "@/types"

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<User>("/auth/me/")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{
      user: User
      access: string
      refresh: string
    }>("/auth/login/", { method: "POST", json: { email, password } })
    setTokens(data.access, data.refresh)
    setUser(data.user)
  }, [])

  const register = useCallback(
    async (formData: {
      email: string
      password: string
      first_name: string
      last_name: string
    }) => {
      const data = await apiFetch<{
        user: User
        access: string
        refresh: string
      }>("/auth/register/", { method: "POST", json: formData })
      setTokens(data.access, data.refresh)
      setUser(data.user)
    },
    []
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    window.location.href = "/login"
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
