"use client"

import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Settings className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Paramètres</h1>
      <p className="text-muted-foreground">
        Les paramètres seront disponibles ici.
      </p>
    </div>
  )
}
