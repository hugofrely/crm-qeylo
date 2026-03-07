"use client"

import type { Company } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Users,
  DollarSign,
  FileText,
  Hash,
  UserCircle,
} from "lucide-react"

/* ── Helpers ── */

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

function getHealthLabel(score: string): string {
  switch (score) {
    case "excellent": return "Excellent"
    case "good": return "Bon"
    case "at_risk": return "A risque"
    case "churned": return "Churned"
    default: return score
  }
}

/* ── Styles ── */

const inputClass = "h-9 bg-secondary/30 border-border/60"
const selectClass =
  "flex h-9 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"

/* ── Props ── */

export interface CompanyInfoProps {
  company: Company
  editing: boolean
  editForm: Record<string, unknown>
  onEditFormChange: (field: string, value: unknown) => void
}

export function CompanyInfo({
  company,
  editing,
  editForm,
  onEditFormChange,
}: CompanyInfoProps) {
  const addressParts = [company.address, company.city, company.zip_code, company.state, company.country].filter(Boolean)
  const fullAddress = addressParts.join(", ")

  if (editing) {
    return (
      <div className="space-y-4">
        {/* Coordonnees */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Coordonnees</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Telephone</Label>
              <Input value={editForm.phone as string} onChange={(e) => onEditFormChange("phone", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Email</Label>
              <Input type="email" value={editForm.email as string} onChange={(e) => onEditFormChange("email", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Site web</Label>
              <Input value={editForm.website as string} onChange={(e) => onEditFormChange("website", e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Adresse</Label>
              <Input value={editForm.address as string} onChange={(e) => onEditFormChange("address", e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-[family-name:var(--font-body)]">Ville</Label>
                <Input value={editForm.city as string} onChange={(e) => onEditFormChange("city", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-[family-name:var(--font-body)]">Pays</Label>
                <Input value={editForm.country as string} onChange={(e) => onEditFormChange("country", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Financier */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Financier</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">CA annuel (EUR)</Label>
              <Input type="number" value={editForm.annual_revenue as string} onChange={(e) => onEditFormChange("annual_revenue", e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Effectif</Label>
              <Input type="number" value={editForm.employee_count as string} onChange={(e) => onEditFormChange("employee_count", e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">SIRET</Label>
              <Input value={editForm.siret as string} onChange={(e) => onEditFormChange("siret", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Numero TVA</Label>
              <Input value={editForm.vat_number as string} onChange={(e) => onEditFormChange("vat_number", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Forme juridique</Label>
              <Input value={editForm.legal_status as string} onChange={(e) => onEditFormChange("legal_status", e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Relationnel */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Relationnel</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Source</Label>
              <Input value={editForm.source as string} onChange={(e) => onEditFormChange("source", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-[family-name:var(--font-body)]">Sante</Label>
              <select className={selectClass} value={editForm.health_score as string} onChange={(e) => onEditFormChange("health_score", e.target.value)}>
                <option value="">-- Aucun --</option>
                <option value="excellent">Excellent</option>
                <option value="good">Bon</option>
                <option value="at_risk">A risque</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className={labelClass}>Description</h3>
          <textarea
            className="flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={editForm.description as string}
            onChange={(e) => onEditFormChange("description", e.target.value)}
            rows={4}
          />
        </div>
      </div>
    )
  }

  /* ── VIEW MODE ── */
  return (
    <div className="space-y-4">
      {/* Coordonnees */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
          Coordonnees
        </h3>
        <div className="space-y-2">
          {company.phone && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${company.phone}`} className="truncate">{company.phone}</a>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${company.email}`} className="truncate text-primary hover:underline">{company.email}</a>
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{company.website}</a>
            </div>
          )}
          {fullAddress && (
            <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{fullAddress}</span>
            </div>
          )}
          {!company.phone && !company.email && !company.website && !fullAddress && (
            <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">Aucune coordonnee renseignee.</p>
          )}
        </div>
      </div>

      {/* Financier */}
      {(company.annual_revenue || company.employee_count || company.siret || company.vat_number || company.legal_status) && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Financier
          </h3>
          <div className="space-y-2">
            {company.annual_revenue && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{formatCurrency(company.annual_revenue)}</span>
              </div>
            )}
            {company.employee_count && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{company.employee_count} employes</span>
              </div>
            )}
            {company.siret && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">SIRET: {company.siret}</span>
              </div>
            )}
            {company.vat_number && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">TVA: {company.vat_number}</span>
              </div>
            )}
            {company.legal_status && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{company.legal_status}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Relationnel */}
      {(company.source || company.health_score || company.owner_name) && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Relationnel
          </h3>
          <div className="space-y-2">
            {company.source && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{company.source}</span>
              </div>
            )}
            {company.health_score && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{getHealthLabel(company.health_score)}</span>
              </div>
            )}
            {company.owner_name && (
              <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                <UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{company.owner_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {company.description && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Description
          </h3>
          <p className="text-sm whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-body)]">
            {company.description}
          </p>
        </div>
      )}
    </div>
  )
}
