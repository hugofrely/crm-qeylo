"use client"

import { Kanban } from "lucide-react"

export default function DealsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Kanban className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Pipeline</h1>
      <p className="text-muted-foreground">
        Le pipeline des deals sera disponible ici.
      </p>
    </div>
  )
}
