"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import Cookies from "js-cookie"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

interface UseWebSocketOptions {
  path: string
  onMessage: (data: unknown) => void
  enabled?: boolean
}

export function useWebSocket({ path, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const [connected, setConnected] = useState(false)

  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled) return

    const token = Cookies.get("access_token")
    if (!token) return

    const url = `${WS_URL}${path}?token=${token}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current(data)
      } catch {
        // ignore invalid JSON
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [path, enabled])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected }
}
