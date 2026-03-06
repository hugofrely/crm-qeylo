"use client"

import { useState, useEffect } from "react"
import { Bell, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchOrgSettings, updateOrgSettings } from "@/services/organizations"

interface ReminderSettingsProps {
  orgId: string
}

const PRESET_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 heure" },
  { value: 120, label: "2 heures" },
  { value: 1440, label: "1 jour" },
  { value: 2880, label: "2 jours" },
]

function formatOffset(minutes: number): string {
  if (minutes >= 1440) {
    const days = minutes / 1440
    return days === 1 ? "1 jour" : `${days} jours`
  }
  if (minutes >= 60) {
    const hours = minutes / 60
    return hours === 1 ? "1 heure" : `${hours} heures`
  }
  return `${minutes} minutes`
}

export default function ReminderSettings({ orgId }: ReminderSettingsProps) {
  const [offsets, setOffsets] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchOrgSettings(orgId)
      .then((data) => setOffsets(data.task_reminder_offsets || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  const save = async (newOffsets: number[]) => {
    setSaving(true)
    try {
      const sorted = [...newOffsets].sort((a, b) => a - b)
      setOffsets(sorted)
      await updateOrgSettings(orgId, { task_reminder_offsets: sorted })
    } catch {
      fetchOrgSettings(orgId).then((data) => setOffsets(data.task_reminder_offsets || []))
    } finally {
      setSaving(false)
    }
  }

  const addOffset = (value: number) => {
    if (!offsets.includes(value)) {
      save([...offsets, value])
    }
  }

  const removeOffset = (value: number) => {
    save(offsets.filter((o) => o !== value))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const availablePresets = PRESET_OPTIONS.filter((p) => !offsets.includes(p.value))

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Rappels de tâches</h2>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
        Recevez une notification avant l&apos;échéance de vos tâches.
      </p>

      {/* Current offsets */}
      <div className="flex flex-wrap gap-2">
        {offsets.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Aucun rappel configuré</p>
        )}
        {offsets.map((offset) => (
          <span
            key={offset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {formatOffset(offset)} avant
            <button
              onClick={() => removeOffset(offset)}
              className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Add preset */}
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => addOffset(preset.value)}
            >
              <Plus className="h-3 w-3" />
              {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
