"use client"

import { useState, useRef, useMemo } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle, ChevronsUpDown, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface FieldOption {
  value: string
  label: string
}

interface FieldGroup {
  label: string
  fields: FieldOption[]
}

const NATIVE_FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Identité",
    fields: [
      { value: "first_name", label: "Prénom" },
      { value: "last_name", label: "Nom" },
      { value: "email", label: "Email" },
      { value: "phone", label: "Téléphone" },
      { value: "mobile_phone", label: "Mobile" },
      { value: "secondary_email", label: "Email secondaire" },
      { value: "secondary_phone", label: "Tél. secondaire" },
    ],
  },
  {
    label: "Entreprise",
    fields: [
      { value: "company", label: "Entreprise" },
      { value: "job_title", label: "Poste" },
      { value: "industry", label: "Secteur" },
      { value: "siret", label: "SIRET" },
    ],
  },
  {
    label: "Localisation",
    fields: [
      { value: "address", label: "Adresse" },
      { value: "city", label: "Ville" },
      { value: "postal_code", label: "Code postal" },
      { value: "country", label: "Pays" },
      { value: "state", label: "Région" },
    ],
  },
  {
    label: "Qualification",
    fields: [
      { value: "lead_score", label: "Score lead" },
      { value: "estimated_budget", label: "Budget estimé" },
      { value: "decision_role", label: "Rôle décision" },
      { value: "identified_needs", label: "Besoins identifiés" },
    ],
  },
  {
    label: "Préférences",
    fields: [
      { value: "preferred_channel", label: "Canal préféré" },
      { value: "timezone", label: "Fuseau horaire" },
      { value: "language", label: "Langue" },
      { value: "birthday", label: "Anniversaire" },
    ],
  },
  {
    label: "Réseaux",
    fields: [
      { value: "linkedin_url", label: "LinkedIn" },
      { value: "twitter_url", label: "Twitter" },
      { value: "website", label: "Site web" },
    ],
  },
  {
    label: "Divers",
    fields: [
      { value: "notes", label: "Notes" },
      { value: "source", label: "Source" },
    ],
  },
]

interface CustomFieldDef {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
}

interface PreviewData {
  headers: string[]
  preview: Record<string, string>[]
  suggested_mapping: Record<string, string>
  total_rows: number
  custom_field_definitions: CustomFieldDef[]
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
  warnings: string[]
}

function FieldMappingCombobox({
  value,
  onChange,
  groups,
  usedValues,
}: {
  value: string
  onChange: (value: string) => void
  groups: FieldGroup[]
  usedValues: Set<string>
}) {
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(() => {
    if (!value) return "— Ignorer —"
    for (const group of groups) {
      const field = group.fields.find((f) => f.value === value)
      if (field) return field.label
    }
    return value
  }, [value, groups])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between bg-secondary/30 font-normal"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un champ..." />
          <CommandList>
            <CommandEmpty>Aucun champ trouvé.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__ignore__"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                — Ignorer —
              </CommandItem>
            </CommandGroup>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.fields.map((field) => {
                  const isUsed = usedValues.has(field.value) && field.value !== value
                  return (
                    <CommandItem
                      key={field.value}
                      value={field.value}
                      keywords={[field.label]}
                      disabled={isUsed}
                      onSelect={() => {
                        onChange(field.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === field.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {field.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ImportCSVDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setMapping({})
    setResult(null)
  }

  const handleFileSelect = async (f: File) => {
    setFile(f)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/contacts/import/preview/`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}`,
          },
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error")
      setPreview(data)
      setMapping(data.suggested_mapping)
      setStep(2)
    } catch (err) {
      console.error("Preview failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mapping", JSON.stringify(mapping))
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/contacts/import/`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}`,
          },
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error")
      setResult(data)
      setStep(3)
      onImported()
    } catch (err) {
      console.error("Import failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const fieldGroups = useMemo<FieldGroup[]>(() => {
    const groups = [...NATIVE_FIELD_GROUPS]
    if (preview?.custom_field_definitions?.length) {
      groups.push({
        label: "Champs personnalisés",
        fields: preview.custom_field_definitions.map((cf) => ({
          value: `custom::${cf.id}`,
          label: cf.label,
        })),
      })
    }
    return groups
  }, [preview?.custom_field_definitions])

  const usedValues = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping]
  )

  const mappedFields = Object.values(mapping).filter(Boolean)
  const hasMandatoryField = mappedFields.includes("first_name")

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Importer des contacts
            {step < 3 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground font-[family-name:var(--font-body)]">
                Étape {step}/3
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFileSelect(f)
              }}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-14 cursor-pointer hover:border-primary/30 hover:bg-secondary/30 transition-all"
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium font-[family-name:var(--font-body)]">
                      Glissez votre fichier CSV ici
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                      ou cliquez pour sélectionner · Max 5 MB
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
              }}
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && preview && (
          <div className="space-y-4 min-w-0 overflow-hidden font-[family-name:var(--font-body)]">
            <p className="text-sm text-muted-foreground">
              {preview.total_rows} lignes détectées. Associez les colonnes aux champs contact.
            </p>

            <div className="space-y-2">
              {preview.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium">
                    {header}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <FieldMappingCombobox
                    value={mapping[header] || ""}
                    onChange={(value) =>
                      setMapping({ ...mapping, [header]: value })
                    }
                    groups={fieldGroups}
                    usedValues={usedValues}
                  />
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-secondary/30">
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-muted-foreground">
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!hasMandatoryField && (
              <p className="text-xs text-destructive">
                Le champ « Prénom » est obligatoire.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button
                onClick={handleImport}
                disabled={!hasMandatoryField || loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importer {preview.total_rows} contacts
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-5 text-center py-6 font-[family-name:var(--font-body)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="text-2xl font-light">
                {result.created} contacts importés
              </p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {result.skipped} doublons ignorés
                </p>
              )}
              {result.errors.length > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {result.errors.length} erreurs
                </p>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-3 text-left mx-auto max-w-md">
                  <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{result.warnings.length} avertissements</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button onClick={() => { setOpen(false); reset() }}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
