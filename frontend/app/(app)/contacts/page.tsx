"use client"

import { Users } from "lucide-react"

export default function ContactsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Users className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Contacts</h1>
      <p className="text-muted-foreground">
        La gestion des contacts sera disponible ici.
      </p>
    </div>
  )
}
