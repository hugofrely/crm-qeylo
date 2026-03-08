"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useCompany } from "@/hooks/useCompanies"
import { updateCompany, deleteCompany as deleteCompanyApi } from "@/services/companies"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import posthog from "posthog-js"
import type { Company } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Users, Briefcase, GitBranch, Clock, BarChart3 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { CompanyHeader } from "@/components/companies/CompanyHeader"
import { CompanyInfo } from "@/components/companies/CompanyInfo"
import { CompanyStats } from "@/components/companies/CompanyStats"
import { CompanyContacts } from "@/components/companies/CompanyContacts"
import { CompanyDeals } from "@/components/companies/CompanyDeals"
import { CompanyHierarchy } from "@/components/companies/CompanyHierarchy"
import { CompanyTimeline } from "@/components/companies/CompanyTimeline"

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { company, loading, reload } = useCompany(id)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [activeTab, setActiveTab] = useState<string>("resume")

  /* ── Start editing ── */
  const startEditing = () => {
    if (!company) return
    setEditForm({
      name: company.name || "",
      industry: company.industry || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      zip_code: company.zip_code || "",
      country: company.country || "",
      annual_revenue: company.annual_revenue || "",
      employee_count: company.employee_count != null ? String(company.employee_count) : "",
      siret: company.siret || "",
      vat_number: company.vat_number || "",
      legal_status: company.legal_status || "",
      source: company.source || "",
      health_score: company.health_score || "",
      description: company.description || "",
    })
    setEditing(true)
  }

  const updateForm = (field: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  /* ── Save handler ── */
  const handleSave = async () => {
    if (!company) return
    setSaving(true)
    try {
      await updateCompany(company.id, {
        ...editForm,
        annual_revenue: editForm.annual_revenue ? parseFloat(editForm.annual_revenue as string) : null,
        employee_count: editForm.employee_count ? parseInt(editForm.employee_count as string, 10) : null,
      })
      posthog.capture("company_edited")
      setEditing(false)
      reload()
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete handler ── */
  const handleDelete = async () => {
    try {
      await deleteCompanyApi(id)
      posthog.capture("company_deleted")
      toast("Element supprime", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreItems("company", [id])
              toast.success("Element restaure")
            } catch {
              toast.error("Erreur lors de la restauration")
            }
          },
        },
        duration: 5000,
      })
      router.push("/companies")
    } catch (err) {
      console.error("Failed to delete company:", err)
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ── Not found ── */
  if (!company) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => router.push("/companies")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground font-[family-name:var(--font-body)]">Entreprise introuvable.</p>
        </div>
      </div>
    )
  }

  /* ── RENDER ── */
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/companies")} className="gap-2 text-muted-foreground -ml-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-[family-name:var(--font-body)] text-sm">Retour aux entreprises</span>
      </Button>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <CompanyHeader
                company={company}
                editing={true}
                saving={saving}
                onToggleEdit={startEditing}
                onSave={handleSave}
                onCancelEdit={() => setEditing(false)}
                onDelete={handleDelete}
              />
              <CompanyInfo
                company={company}
                editing={true}
                editForm={editForm}
                onEditFormChange={updateForm}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <CompanyHeader
                  company={company}
                  editing={false}
                  saving={saving}
                  onToggleEdit={startEditing}
                  onSave={handleSave}
                  onCancelEdit={() => setEditing(false)}
                  onDelete={handleDelete}
                />
              </div>
              <CompanyInfo
                company={company}
                editing={false}
                editForm={editForm}
                onEditFormChange={updateForm}
              />
            </div>
          )}
        </div>

        {/* RIGHT PANEL (TABS) */}
        <div className="flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden pt-2 w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-2">
              <TabsList responsive className="w-full justify-start overflow-x-auto scrollbar-hide">
                <TabsTrigger value="resume" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Resume</span>
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  <span>Contacts</span>
                </TabsTrigger>
                <TabsTrigger value="deals" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Deals</span>
                </TabsTrigger>
                <TabsTrigger value="hierarchy" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Hierarchie</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Timeline</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resume" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Vue d'ensemble
                  </h2>
                </div>
                <CompanyStats companyId={id} />
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Contacts ({company.contacts_count})
                  </h2>
                </div>
                <CompanyContacts companyId={id} />
              </div>
            </TabsContent>

            <TabsContent value="deals" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Deals ({company.deals_count})
                  </h2>
                </div>
                <CompanyDeals companyId={id} />
              </div>
            </TabsContent>

            <TabsContent value="hierarchy" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Hierarchie
                  </h2>
                </div>
                <CompanyHierarchy companyId={id} />
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Timeline
                  </h2>
                </div>
                <CompanyTimeline companyId={id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
