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
}

export const entityConfig: Record<string, EntityConfig> = {
  contact: { icon: User, borderColor: "border-l-blue-500", iconColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", label: "Contact" },
  contact_category: { icon: Tags, borderColor: "border-l-indigo-500", iconColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30", label: "Categorie" },
  deal: { icon: Briefcase, borderColor: "border-l-emerald-500", iconColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", label: "Deal" },
  task: { icon: CheckSquare, borderColor: "border-l-purple-500", iconColor: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", label: "Tache" },
  note: { icon: StickyNote, borderColor: "border-l-orange-500", iconColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", label: "Note" },
  interaction: { icon: StickyNote, borderColor: "border-l-orange-500", iconColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", label: "Interaction" },
  email: { icon: Mail, borderColor: "border-l-cyan-500", iconColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30", label: "Email" },
  email_template: { icon: Mail, borderColor: "border-l-cyan-500", iconColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30", label: "Template" },
  segment: { icon: Layers, borderColor: "border-l-pink-500", iconColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30", label: "Segment" },
  workflow: { icon: Zap, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Workflow" },
  stage: { icon: ArrowRight, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Stage" },
  dashboard: { icon: BarChart3, borderColor: "border-l-indigo-500", iconColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30", label: "Dashboard" },
  chart: { icon: BarChart3, borderColor: "border-l-violet-500", iconColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30", label: "Graphique" },
  contact_list: { icon: List, borderColor: "border-l-blue-500", iconColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", label: "Contacts" },
  deal_list: { icon: List, borderColor: "border-l-emerald-500", iconColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", label: "Deals" },
  task_list: { icon: List, borderColor: "border-l-purple-500", iconColor: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", label: "Taches" },
  search_results: { icon: Search, borderColor: "border-l-gray-500", iconColor: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30", label: "Recherche" },
  workflow_list: { icon: Zap, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Workflows" },
  workflow_executions: { icon: Zap, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Executions" },
  email_template_list: { icon: Mail, borderColor: "border-l-cyan-500", iconColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30", label: "Templates" },
  segment_list: { icon: Layers, borderColor: "border-l-pink-500", iconColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30", label: "Segments" },
  stage_list: { icon: ArrowRight, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Stages" },
  timeline: { icon: List, borderColor: "border-l-gray-500", iconColor: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30", label: "Timeline" },
  category_list: { icon: Tags, borderColor: "border-l-indigo-500", iconColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30", label: "Categories" },
}

export function getConfig(entityType: string | undefined): EntityConfig {
  return entityConfig[entityType || ""] || entityConfig.contact
}
