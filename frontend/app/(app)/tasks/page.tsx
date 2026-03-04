"use client"

import { CheckSquare } from "lucide-react"

export default function TasksPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Tâches</h1>
      <p className="text-muted-foreground">
        La gestion des tâches sera disponible ici.
      </p>
    </div>
  )
}
