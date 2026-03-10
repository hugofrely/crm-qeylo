"use client"

import { ChatWindow } from "@/components/chat/ChatWindow"
import { QuotaBanner } from "@/components/plan/QuotaBanner"

export default function ChatPage() {
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <QuotaBanner quota="ai_messages" label="messages IA" />
      <div className="flex-1 min-h-0">
        <ChatWindow />
      </div>
    </div>
  )
}
