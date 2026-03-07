import {
  User, Briefcase, CheckSquare, StickyNote, Mail,
  BarChart3, Layers, Zap, ArrowRight, Tags, Link2,
  AlertCircle, List, Trash2, Search, type LucideIcon,
} from "lucide-react"

export interface EntityConfig {
  icon: LucideIcon
  borderColor: string
  iconColor: string
  bgColor: string
  label: string
  accentFrom: string
  accentTo: string
  lightBg: string
  badgeBg: string
  badgeText: string
}

const c = (
  icon: LucideIcon,
  borderColor: string,
  iconColor: string,
  bgColor: string,
  label: string,
  accentFrom: string,
  accentTo: string,
  lightBg: string,
  badgeBg: string,
  badgeText: string
): EntityConfig => ({ icon, borderColor, iconColor, bgColor, label, accentFrom, accentTo, lightBg, badgeBg, badgeText })

export const entityConfig: Record<string, EntityConfig> = {
  contact:              c(User,        "border-l-blue-500",    "text-blue-600",    "bg-blue-50 dark:bg-blue-950/30",    "Contact",     "from-blue-400",    "to-blue-500",    "bg-blue-50/60",    "bg-blue-100/80",    "text-blue-700"),
  contact_category:     c(Tags,        "border-l-indigo-500",  "text-indigo-600",  "bg-indigo-50 dark:bg-indigo-950/30","Categorie",   "from-indigo-400",  "to-indigo-500",  "bg-indigo-50/60",  "bg-indigo-100/80",  "text-indigo-700"),
  deal:                 c(Briefcase,   "border-l-emerald-500", "text-emerald-600", "bg-emerald-50 dark:bg-emerald-950/30","Deal",       "from-emerald-400", "to-emerald-500", "bg-emerald-50/60", "bg-emerald-100/80", "text-emerald-700"),
  task:                 c(CheckSquare, "border-l-purple-500",  "text-purple-600",  "bg-purple-50 dark:bg-purple-950/30","Tache",       "from-purple-400",  "to-purple-500",  "bg-purple-50/60",  "bg-purple-100/80",  "text-purple-700"),
  note:                 c(StickyNote,  "border-l-orange-500",  "text-orange-600",  "bg-orange-50 dark:bg-orange-950/30","Note",        "from-orange-400",  "to-orange-500",  "bg-orange-50/60",  "bg-orange-100/80",  "text-orange-700"),
  interaction:          c(StickyNote,  "border-l-orange-500",  "text-orange-600",  "bg-orange-50 dark:bg-orange-950/30","Interaction", "from-orange-400",  "to-orange-500",  "bg-orange-50/60",  "bg-orange-100/80",  "text-orange-700"),
  email:                c(Mail,        "border-l-cyan-500",    "text-cyan-600",    "bg-cyan-50 dark:bg-cyan-950/30",    "Email",       "from-cyan-400",    "to-cyan-500",    "bg-cyan-50/60",    "bg-cyan-100/80",    "text-cyan-700"),
  email_template:       c(Mail,        "border-l-cyan-500",    "text-cyan-600",    "bg-cyan-50 dark:bg-cyan-950/30",    "Template",    "from-cyan-400",    "to-cyan-500",    "bg-cyan-50/60",    "bg-cyan-100/80",    "text-cyan-700"),
  segment:              c(Layers,      "border-l-pink-500",    "text-pink-600",    "bg-pink-50 dark:bg-pink-950/30",    "Segment",     "from-pink-400",    "to-pink-500",    "bg-pink-50/60",    "bg-pink-100/80",    "text-pink-700"),
  workflow:             c(Zap,         "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Workflow",    "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  stage:                c(ArrowRight,  "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Stage",       "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  dashboard:            c(BarChart3,   "border-l-indigo-500",  "text-indigo-600",  "bg-indigo-50 dark:bg-indigo-950/30","Dashboard",   "from-indigo-400",  "to-indigo-500",  "bg-indigo-50/60",  "bg-indigo-100/80",  "text-indigo-700"),
  chart:                c(BarChart3,   "border-l-violet-500",  "text-violet-600",  "bg-violet-50 dark:bg-violet-950/30","Graphique",   "from-violet-400",  "to-violet-500",  "bg-violet-50/60",  "bg-violet-100/80",  "text-violet-700"),
  contact_list:         c(List,        "border-l-blue-500",    "text-blue-600",    "bg-blue-50 dark:bg-blue-950/30",    "Contacts",    "from-blue-400",    "to-blue-500",    "bg-blue-50/60",    "bg-blue-100/80",    "text-blue-700"),
  deal_list:            c(List,        "border-l-emerald-500", "text-emerald-600", "bg-emerald-50 dark:bg-emerald-950/30","Deals",      "from-emerald-400", "to-emerald-500", "bg-emerald-50/60", "bg-emerald-100/80", "text-emerald-700"),
  task_list:            c(List,        "border-l-purple-500",  "text-purple-600",  "bg-purple-50 dark:bg-purple-950/30","Taches",      "from-purple-400",  "to-purple-500",  "bg-purple-50/60",  "bg-purple-100/80",  "text-purple-700"),
  search_results:       c(Search,      "border-l-gray-500",    "text-gray-600",    "bg-gray-50 dark:bg-gray-950/30",    "Recherche",   "from-gray-400",    "to-gray-500",    "bg-gray-50/60",    "bg-gray-100/80",    "text-gray-700"),
  workflow_list:        c(Zap,         "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Workflows",   "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  workflow_executions:  c(Zap,         "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Executions",  "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  email_template_list:  c(Mail,        "border-l-cyan-500",    "text-cyan-600",    "bg-cyan-50 dark:bg-cyan-950/30",    "Templates",   "from-cyan-400",    "to-cyan-500",    "bg-cyan-50/60",    "bg-cyan-100/80",    "text-cyan-700"),
  segment_list:         c(Layers,      "border-l-pink-500",    "text-pink-600",    "bg-pink-50 dark:bg-pink-950/30",    "Segments",    "from-pink-400",    "to-pink-500",    "bg-pink-50/60",    "bg-pink-100/80",    "text-pink-700"),
  stage_list:           c(ArrowRight,  "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Stages",      "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  timeline:             c(List,        "border-l-gray-500",    "text-gray-600",    "bg-gray-50 dark:bg-gray-950/30",    "Timeline",    "from-gray-400",    "to-gray-500",    "bg-gray-50/60",    "bg-gray-100/80",    "text-gray-700"),
  category_list:        c(Tags,        "border-l-indigo-500",  "text-indigo-600",  "bg-indigo-50 dark:bg-indigo-950/30","Categories",  "from-indigo-400",  "to-indigo-500",  "bg-indigo-50/60",  "bg-indigo-100/80",  "text-indigo-700"),
}

export function getConfig(entityType: string | undefined): EntityConfig {
  return entityConfig[entityType || ""] || entityConfig.contact
}

export function getEntityLink(action: { entity_type?: string; entity_id?: string; link?: string }): string | null {
  if (action.link) return action.link
  if (!action.entity_id || !action.entity_type) return null
  const routes: Record<string, string> = {
    contact: "/contacts",
    deal: "/deals",
    task: "/tasks",
    segment: "/segments",
    workflow: "/workflows",
    email_template: "/settings/email-templates",
    report: "/reports",
  }
  const base = routes[action.entity_type]
  if (base) return `${base}/${action.entity_id}`
  return null
}
