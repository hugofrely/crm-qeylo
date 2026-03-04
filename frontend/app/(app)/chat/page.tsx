"use client"

import { MessageSquare } from "lucide-react"

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">Chat IA</h1>
      <p className="text-muted-foreground">
        L&apos;assistant IA sera disponible ici.
      </p>
    </div>
  )
}
