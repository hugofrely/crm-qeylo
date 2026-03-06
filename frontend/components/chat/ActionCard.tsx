"use client"

import type { EnrichedAction } from "@/types/chat"
import { EntityCreatedCard } from "./action-cards/EntityCreatedCard"
import { EntityUpdatedCard } from "./action-cards/EntityUpdatedCard"
import { EntityDeletedCard } from "./action-cards/EntityDeletedCard"
import { ContactListCard } from "./action-cards/ContactListCard"
import { ChartCard } from "./action-cards/ChartCard"
import { NavigationCard } from "./action-cards/NavigationCard"
import { ErrorCard } from "./action-cards/ErrorCard"
import { DashboardCard } from "./action-cards/DashboardCard"
import { ListCard } from "./action-cards/ListCard"

export function ActionCard({ action }: { action: EnrichedAction }) {
  const a = action.action

  // Error
  if (a === "error") return <ErrorCard action={action} />

  // Chart
  if (a === "chart_generated") return <ChartCard action={action} />

  // Navigation
  if (a === "navigation") return <NavigationCard action={action} />

  // Dashboard
  if (a === "dashboard_summary") return <DashboardCard action={action} />

  // Contact query results
  if (a === "contacts_queried" || a === "segment_contacts")
    return <ContactListCard action={action} />

  // Deleted entities
  if (a.endsWith("_deleted")) return <EntityDeletedCard action={action} />

  // Updated entities
  if (a.endsWith("_updated") || a === "deal_moved" || a === "categories_updated" || a === "custom_field_updated" || a === "workflow_toggled" || a === "note_updated")
    return <EntityUpdatedCard action={action} />

  // List results
  if (a.startsWith("list_") || a.startsWith("search_") || action.entity_type?.endsWith("_list"))
    return <ListCard action={action} />

  // Created / details / completed / other entity actions
  if (action.entity_preview) return <EntityCreatedCard action={action} />

  // Fallback
  return <EntityCreatedCard action={action} />
}
