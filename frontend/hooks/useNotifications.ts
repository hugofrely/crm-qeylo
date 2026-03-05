"use client"

import { useState, useEffect, useCallback } from "react"
import type { Notification } from "@/types"
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } from "@/services/notifications"

const POLL_INTERVAL = 30_000

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await fetchUnreadCount()
      setUnreadCount(data.count)
    } catch {
      // silently fail
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const markRead = useCallback(async (id: number) => {
    await markAsRead([id])
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  return { notifications, unreadCount, loading, loadNotifications, markRead, markAllRead }
}
