"use client"

import Link from "next/link"
import type { Contact, CustomFieldDefinition } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useCompanyAutocomplete } from "@/hooks/useCompanyAutocomplete"
import {
  Mail,
  Phone,
  Building2,
  Globe,
  Tag,
  Linkedin,
  MapPin,
  Target,
  Heart,
  Clock,
  Languages,
  Cake,
  Thermometer,
  Wallet,
  MessageCircle,
  FileText,
  Smartphone,
  Twitter,
  Search,
  X,
  Loader2,
} from "lucide-react"

/* ── Helpers ── */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatCurrency(value: string | null): string {
  if (!value) return ""
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatBirthday(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function getLeadScoreStyle(score: string) {
  switch (score) {
    case "hot":
      return "bg-rose-100 text-rose-700 border-rose-200"
    case "warm":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "cold":
      return "bg-blue-100 text-blue-700 border-blue-200"
    default:
      return "bg-secondary text-muted-foreground border-border"
  }
}

function getLeadScoreLabel(score: string) {
  switch (score) {
    case "hot":
      return "Chaud"
    case "warm":
      return "Tiede"
    case "cold":
      return "Froid"
    default:
      return score
  }
}

function getDecisionRoleLabel(role: string) {
  switch (role) {
    case "decision_maker":
      return "Decideur"
    case "influencer":
      return "Influenceur"
    case "user":
      return "Utilisateur"
    case "other":
      return "Autre"
    default:
      return role
  }
}

function getChannelLabel(channel: string) {
  switch (channel) {
    case "email":
      return "Email"
    case "phone":
      return "Telephone"
    case "linkedin":
      return "LinkedIn"
    case "other":
      return "Autre"
    default:
      return channel
  }
}

/* ── Styles ── */

const inputClass = "h-9 bg-secondary/30 border-border/60"
const textareaClass =
  "flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const selectClass =
  "flex h-9 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"

/* ── Company Field ── */

function CompanyField({
  companyEntityId,
  companyEntityName,
  companyText,
  onSelectCompany,
  onClearCompany,
  onTextChange,
}: {
  companyEntityId: string | null
  companyEntityName: string | null
  companyText: string
  onSelectCompany: (id: string, name: string) => void
  onClearCompany: () => void
  onTextChange: (val: string) => void
}) {
  const autocomplete = useCompanyAutocomplete()

  return (
    <div className="space-y-1">
      <Label className="text-xs font-[family-name:var(--font-body)]">Entreprise</Label>
      {companyEntityId && companyEntityName ? (
        <div className="flex items-center gap-2">
          <div className={`flex-1 flex items-center gap-2 ${inputClass} rounded-lg px-3`}>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Link href={`/companies/${companyEntityId}`} className="text-sm text-primary hover:underline truncate">
              {companyEntityName}
            </Link>
          </div>
          <button
            type="button"
            onClick={onClearCompany}
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div ref={autocomplete.wrapperRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={autocomplete.query || companyText}
              onChange={(e) => {
                onTextChange(e.target.value)
                autocomplete.search(e.target.value)
              }}
              onFocus={() => {
                if (companyText && !autocomplete.query) {
                  autocomplete.search(companyText)
                }
                if (autocomplete.results.length > 0) autocomplete.setOpen(true)
              }}
              placeholder="Rechercher ou saisir une entreprise..."
              className={`${inputClass} pl-8`}
            />
            {autocomplete.searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          {autocomplete.open && autocomplete.results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
              {autocomplete.results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                  onClick={() => {
                    onSelectCompany(c.id, c.name)
                    autocomplete.reset()
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.industry && <span className="text-muted-foreground ml-1">({c.industry})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Props ── */

export interface ContactInfoProps {
  contact: Contact
  editing: boolean
  editForm: Record<string, unknown>
  onEditFormChange: (field: string, value: unknown) => void
  customFieldDefs: CustomFieldDefinition[]
}

export function ContactInfo({
  contact,
  editing,
  editForm,
  onEditFormChange,
  customFieldDefs,
}: ContactInfoProps) {
  const updateCustomField = (fieldId: string, value: unknown) => {
    onEditFormChange("custom_fields", {
      ...((editForm.custom_fields as Record<string, unknown>) || {}),
      [fieldId]: value,
    })
  }

  const addressParts = [contact.address, contact.city, contact.postal_code, contact.state, contact.country].filter(Boolean)
  const fullAddress = addressParts.join(", ")

  if (editing) {
    return (
      <div className="space-y-4">
        {/* Identity */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Identite</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Prenom</Label>
              <Input value={editForm.first_name as string} onChange={(e) => onEditFormChange("first_name", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Nom</Label>
              <Input value={editForm.last_name as string} onChange={(e) => onEditFormChange("last_name", e.target.value)} className={inputClass} />
            </div>
          </div>
          <CompanyField
            companyEntityId={editForm.company_entity as string | null}
            companyEntityName={editForm._company_entity_name as string | null}
            companyText={editForm.company as string}
            onSelectCompany={(id, name) => {
              onEditFormChange("company_entity", id)
              onEditFormChange("_company_entity_name", name)
              onEditFormChange("company", name)
            }}
            onClearCompany={() => {
              onEditFormChange("company_entity", null)
              onEditFormChange("_company_entity_name", null)
            }}
            onTextChange={(val) => onEditFormChange("company", val)}
          />
          <div className="space-y-1">
            <Label className="text-xs font-[family-name:var(--font-body)]">Poste</Label>
            <Input value={editForm.job_title as string} onChange={(e) => onEditFormChange("job_title", e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Coordonnées */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Coordonnées</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Email</Label>
              <Input type="email" value={editForm.email as string} onChange={(e) => onEditFormChange("email", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Email secondaire</Label>
              <Input type="email" value={editForm.secondary_email as string} onChange={(e) => onEditFormChange("secondary_email", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Telephone</Label>
              <Input value={editForm.phone as string} onChange={(e) => onEditFormChange("phone", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Telephone secondaire</Label>
              <Input value={editForm.secondary_phone as string} onChange={(e) => onEditFormChange("secondary_phone", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Mobile</Label>
              <Input value={editForm.mobile_phone as string} onChange={(e) => onEditFormChange("mobile_phone", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Adresse</Label>
              <Input value={editForm.address as string} onChange={(e) => onEditFormChange("address", e.target.value)} className={inputClass} placeholder="Adresse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-[family-name:var(--font-body)]">Ville</Label>
                <Input value={editForm.city as string} onChange={(e) => onEditFormChange("city", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-[family-name:var(--font-body)]">Code postal</Label>
                <Input value={editForm.postal_code as string} onChange={(e) => onEditFormChange("postal_code", e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-[family-name:var(--font-body)]">Region</Label>
                <Input value={editForm.state as string} onChange={(e) => onEditFormChange("state", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-[family-name:var(--font-body)]">Pays</Label>
                <Input value={editForm.country as string} onChange={(e) => onEditFormChange("country", e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">LinkedIn</Label>
              <Input value={editForm.linkedin_url as string} onChange={(e) => onEditFormChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Site web</Label>
              <Input value={editForm.website as string} onChange={(e) => onEditFormChange("website", e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Twitter</Label>
              <Input value={editForm.twitter_url as string} onChange={(e) => onEditFormChange("twitter_url", e.target.value)} placeholder="https://twitter.com/..." className={inputClass} />
            </div>
          </div>
        </div>

        {/* Qualification */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Qualification</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Score</Label>
              <select className={selectClass} value={editForm.lead_score as string} onChange={(e) => onEditFormChange("lead_score", e.target.value)}>
                <option value="">-- Aucun --</option>
                <option value="hot">Chaud</option>
                <option value="warm">Tiede</option>
                <option value="cold">Froid</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Budget estime (EUR)</Label>
              <Input type="number" value={editForm.estimated_budget as string} onChange={(e) => onEditFormChange("estimated_budget", e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Role de decision</Label>
              <select className={selectClass} value={editForm.decision_role as string} onChange={(e) => onEditFormChange("decision_role", e.target.value)}>
                <option value="">-- Aucun --</option>
                <option value="decision_maker">Decideur</option>
                <option value="influencer">Influenceur</option>
                <option value="user">Utilisateur</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Besoins identifies</Label>
              <textarea className={textareaClass} value={editForm.identified_needs as string} onChange={(e) => onEditFormChange("identified_needs", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Profil & Preferences</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Source</Label>
              <Input value={editForm.source as string} onChange={(e) => onEditFormChange("source", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Industrie</Label>
              <Input value={editForm.industry as string} onChange={(e) => onEditFormChange("industry", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Canal prefere</Label>
              <select className={selectClass} value={editForm.preferred_channel as string} onChange={(e) => onEditFormChange("preferred_channel", e.target.value)}>
                <option value="">-- Aucun --</option>
                <option value="email">Email</option>
                <option value="phone">Telephone</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Langue</Label>
              <Input value={editForm.language as string} onChange={(e) => onEditFormChange("language", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Fuseau horaire</Label>
              <Input value={editForm.timezone as string} onChange={(e) => onEditFormChange("timezone", e.target.value)} placeholder="Europe/Paris" className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Anniversaire</Label>
              <Input type="date" value={editForm.birthday as string} onChange={(e) => onEditFormChange("birthday", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Tags (virgules)</Label>
              <Input
                value={(editForm.tags as string[])?.join(", ") || ""}
                onChange={(e) =>
                  onEditFormChange(
                    "tags",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="VIP, Prospect, Partenaire"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Interets (virgules)</Label>
              <Input
                value={(editForm.interests as string[])?.join(", ") || ""}
                onChange={(e) =>
                  onEditFormChange(
                    "interests",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="Tech, Sport, Marketing"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">SIRET</Label>
              <Input value={editForm.siret as string} onChange={(e) => onEditFormChange("siret", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Notes</h3>
          <textarea className={textareaClass} value={editForm.notes as string} onChange={(e) => onEditFormChange("notes", e.target.value)} rows={4} />
        </div>

        {/* Custom fields */}
        {customFieldDefs.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className={labelClass}>Champs personnalises</h3>
            <div className="space-y-3">
              {customFieldDefs.map((def) => {
                const cfValues = (editForm.custom_fields as Record<string, unknown>) || {}
                const value = cfValues[def.id] ?? ""

                return (
                  <div key={def.id} className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">
                      {def.label}{def.is_required ? " *" : ""}
                    </Label>
                    {def.field_type === "long_text" ? (
                      <textarea
                        className={textareaClass}
                        value={value as string}
                        onChange={(e) => updateCustomField(def.id, e.target.value)}
                      />
                    ) : def.field_type === "select" ? (
                      <select
                        className={selectClass}
                        value={value as string}
                        onChange={(e) => updateCustomField(def.id, e.target.value)}
                      >
                        <option value="">-- Choisir --</option>
                        {(def.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : def.field_type === "checkbox" ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          checked={value === true || value === "true"}
                          onCheckedChange={(checked) => updateCustomField(def.id, checked)}
                        />
                        <span className="text-sm font-[family-name:var(--font-body)]">{def.label}</span>
                      </div>
                    ) : (
                      <Input
                        type={
                          def.field_type === "number" ? "number" :
                          def.field_type === "date" ? "date" :
                          def.field_type === "email" ? "email" :
                          def.field_type === "phone" ? "tel" :
                          def.field_type === "url" ? "url" :
                          "text"
                        }
                        value={value as string}
                        onChange={(e) => updateCustomField(def.id, e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── VIEW MODE ── */
  return (
    <div className="space-y-4">
      {/* Coordonnées */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
          Coordonnées
        </h3>
        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.email}`} className="truncate text-primary hover:underline">{contact.email}</a>
            </div>
          )}
          {contact.secondary_email && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.secondary_email}`} className="truncate text-primary hover:underline">{contact.secondary_email}</a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${contact.phone}`} className="truncate">{contact.phone}</a>
            </div>
          )}
          {contact.secondary_phone && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{contact.secondary_phone}</span>
            </div>
          )}
          {contact.mobile_phone && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${contact.mobile_phone}`} className="truncate">{contact.mobile_phone}</a>
            </div>
          )}
          {fullAddress && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{fullAddress}</span>
            </div>
          )}
          {contact.linkedin_url && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Linkedin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">LinkedIn</a>
            </div>
          )}
          {contact.website && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{contact.website}</a>
            </div>
          )}
          {contact.twitter_url && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Twitter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={contact.twitter_url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">Twitter</a>
            </div>
          )}
          {!contact.email && !contact.phone && !contact.mobile_phone && !fullAddress && !contact.linkedin_url && !contact.website && (
            <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">Aucune coordonnee renseignee.</p>
          )}
        </div>
      </div>

      {/* Qualification */}
      {(contact.lead_score || contact.estimated_budget || contact.decision_role || contact.identified_needs) && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Qualification
          </h3>
          <div className="space-y-2">
            {contact.lead_score && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Thermometer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getLeadScoreStyle(contact.lead_score)}`}>
                  {getLeadScoreLabel(contact.lead_score)}
                </span>
              </div>
            )}
            {contact.estimated_budget && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{formatCurrency(contact.estimated_budget)}</span>
              </div>
            )}
            {contact.decision_role && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{getDecisionRoleLabel(contact.decision_role)}</span>
              </div>
            )}
            {contact.identified_needs && (
              <div className="flex items-start gap-2 text-sm font-[family-name:var(--font-body)]">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap leading-relaxed">{contact.identified_needs}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profil info */}
      {(contact.industry || contact.source || (contact.tags && contact.tags.length > 0) || contact.preferred_channel || contact.language || contact.timezone || contact.birthday || (contact.interests && contact.interests.length > 0) || contact.siret) && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Profil
          </h3>
          <div className="space-y-2">
            {(contact.company_entity_name || contact.company) && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {contact.company_entity && contact.company_entity_name ? (
                  <Link href={`/companies/${contact.company_entity}`} className="truncate text-primary hover:underline">{contact.company_entity_name}</Link>
                ) : (
                  <span className="truncate">{contact.company}</span>
                )}
              </div>
            )}
            {contact.industry && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.industry}</span>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.source}</span>
              </div>
            )}
            {contact.preferred_channel && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Badge variant="secondary" className="font-normal text-xs">{getChannelLabel(contact.preferred_channel)}</Badge>
              </div>
            )}
            {contact.language && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.language}</span>
              </div>
            )}
            {contact.timezone && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.timezone}</span>
              </div>
            )}
            {contact.birthday && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Cake className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{formatBirthday(contact.birthday)}</span>
              </div>
            )}
            {contact.siret && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">SIRET: {contact.siret}</span>
              </div>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal text-xs font-[family-name:var(--font-body)]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {contact.interests && contact.interests.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Heart className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">Centres d&apos;interet</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contact.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="font-normal text-xs font-[family-name:var(--font-body)]">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom fields */}
      {customFieldDefs.length > 0 && (() => {
        const cf = contact.custom_fields || {}
        const filledFields = customFieldDefs.filter((def) => {
          const val = cf[def.id]
          return val !== undefined && val !== null && val !== ""
        })
        if (filledFields.length === 0) return null
        return (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
              Champs personnalises
            </h3>
            <div className="space-y-2">
              {filledFields.map((def) => {
                const val = cf[def.id]
                let displayVal = String(val)
                if (def.field_type === "checkbox") {
                  displayVal = val === true || val === "true" ? "Oui" : "Non"
                } else if (def.field_type === "date" && val) {
                  displayVal = formatDate(String(val))
                }
                return (
                  <div key={def.id} className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground text-xs">{def.label}:</span>
                    <span className="truncate">{displayVal}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Notes */}
      {contact.notes && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-body)]">
            {contact.notes}
          </p>
        </div>
      )}
    </div>
  )
}
