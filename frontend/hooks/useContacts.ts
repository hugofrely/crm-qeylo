"use client"

import { useState, useEffect, useCallback } from "react"
import type { Contact, ContactCategory, CustomFieldDefinition } from "@/types"
import { fetchContact, fetchContactCategories, fetchCustomFieldDefinitions } from "@/services/contacts"
import { useOrganization } from "@/lib/organization"

export function useContact(id: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchContact(id)
      setContact(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { contact, setContact, loading, error, refresh }
}

export function useContactCategories() {
  const { orgVersion } = useOrganization()
  const [categories, setCategories] = useState<ContactCategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchContactCategories()
      setCategories(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { categories, setCategories, loading, refresh }
}

export function useCustomFieldDefinitions() {
  const { orgVersion } = useOrganization()
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchCustomFieldDefinitions()
      setDefinitions(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { definitions, setDefinitions, loading, refresh }
}
