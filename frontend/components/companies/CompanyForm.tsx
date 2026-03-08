"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createCompany, updateCompany, deleteCompany } from "@/services/companies"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import posthog from "posthog-js"
import { handleQuotaError } from "@/lib/quota-error"
import { useTranslations } from "next-intl"
import type { Company } from "@/types"

interface CompanyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: Company | null
  onCreated: () => void
}

export function CompanyForm({
  open,
  onOpenChange,
  company,
  onCreated,
}: CompanyFormProps) {
  const t = useTranslations('companies')
  const isEditing = !!company

  const [name, setName] = useState("")
  const [industry, setIndustry] = useState("")
  const [website, setWebsite] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [healthScore, setHealthScore] = useState("")
  const [annualRevenue, setAnnualRevenue] = useState("")
  const [employeeCount, setEmployeeCount] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open) {
      if (company) {
        setName(company.name || "")
        setIndustry(company.industry || "")
        setWebsite(company.website || "")
        setPhone(company.phone || "")
        setEmail(company.email || "")
        setHealthScore(company.health_score || "")
        setAnnualRevenue(company.annual_revenue || "")
        setEmployeeCount(company.employee_count != null ? String(company.employee_count) : "")
        setDescription(company.description || "")
      } else {
        setName("")
        setIndustry("")
        setWebsite("")
        setPhone("")
        setEmail("")
        setHealthScore("")
        setAnnualRevenue("")
        setEmployeeCount("")
        setDescription("")
      }
    }
  }, [open, company])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        industry: industry.trim(),
        website: website.trim(),
        phone: phone.trim(),
        email: email.trim(),
        health_score: healthScore || null,
        annual_revenue: annualRevenue ? parseFloat(annualRevenue) : null,
        employee_count: employeeCount ? parseInt(employeeCount, 10) : null,
        description: description.trim(),
      }

      if (isEditing) {
        await updateCompany(company!.id, payload)
        posthog.capture("company_edited")
      } else {
        await createCompany(payload)
        posthog.capture("company_created")
      }

      onOpenChange(false)
      onCreated()
    } catch (err) {
      if (handleQuotaError(err)) return
      console.error("Failed to save company:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!company) return
    if (!window.confirm(t('form.deleteConfirm'))) return
    setDeleting(true)
    try {
      const companyId = company.id
      await deleteCompany(companyId)
      posthog.capture("company_deleted")
      toast(t('toast.deleted'), {
        action: {
          label: t('toast.undo'),
          onClick: async () => {
            try {
              await restoreItems("company", [companyId])
              toast.success(t('toast.restored'))
              onCreated()
            } catch {
              toast.error(t('toast.restoreError'))
            }
          },
        },
        duration: 5000,
      })
      onOpenChange(false)
      onCreated()
    } catch (err) {
      console.error("Failed to delete company:", err)
    } finally {
      setDeleting(false)
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('form.editTitle') : t('form.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-[family-name:var(--font-body)]">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="company-name">{t('form.nameLabel')}</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              required
            />
          </div>

          {/* Secteur + Sante */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company-industry">{t('form.industryLabel')}</Label>
              <Input
                id="company-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t('form.industryPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-health">{t('form.healthLabel')}</Label>
              <select
                id="company-health"
                value={healthScore}
                onChange={(e) => setHealthScore(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('form.healthNone')}</option>
                <option value="excellent">{t('healthScore.excellent')}</option>
                <option value="good">{t('healthScore.good')}</option>
                <option value="at_risk">{t('healthScore.atRisk')}</option>
                <option value="churned">{t('healthScore.churned')}</option>
              </select>
            </div>
          </div>

          {/* Email + Telephone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company-email">{t('form.emailLabel')}</Label>
              <Input
                id="company-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('form.emailPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-phone">{t('form.phoneLabel')}</Label>
              <Input
                id="company-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('form.phonePlaceholder')}
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="company-website">{t('form.websiteLabel')}</Label>
            <Input
              id="company-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t('form.websitePlaceholder')}
            />
          </div>

          {/* CA + Effectif */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company-revenue">{t('form.revenueLabel')}</Label>
              <Input
                id="company-revenue"
                type="number"
                min="0"
                step="0.01"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-employees">{t('form.employeeCountLabel')}</Label>
              <Input
                id="company-employees"
                type="number"
                min="0"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="company-description">{t('form.descriptionLabel')}</Label>
            <textarea
              id="company-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              className="flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {isEditing ? (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t('form.deleteButton')}
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? t('form.saveButton') : t('form.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
