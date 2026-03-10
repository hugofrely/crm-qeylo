"use client"

import { ChatWindow } from "@/components/chat/ChatWindow"
import { QuotaBanner } from "@/components/plan/QuotaBanner"
import { useTranslations } from "next-intl"

export default function ChatPage() {
  const t = useTranslations("chat")
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <QuotaBanner quota="ai_messages" label={t("aiMessages")} />
      <div className="flex-1 min-h-0">
        <ChatWindow />
      </div>
    </div>
  )
}
