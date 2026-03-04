"use client"

import { BarChart3 } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground">
        Le tableau de bord sera disponible ici.
      </p>
    </div>
  )
}
