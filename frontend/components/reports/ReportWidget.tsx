"use client"

import { MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { WidgetConfig } from "@/types"
import { WidgetChart } from "./WidgetChart"

interface ReportWidgetProps {
  widget: WidgetConfig
  globalDateRange?: string
  onEdit: (widget: WidgetConfig) => void
  onDuplicate: (widget: WidgetConfig) => void
  onDelete: (widgetId: string) => void
}

export function ReportWidget({
  widget,
  globalDateRange,
  onEdit,
  onDuplicate,
  onDelete,
}: ReportWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-medium tracking-tight">{widget.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(widget)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(widget)}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(widget.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-4">
        <WidgetChart widget={widget} globalDateRange={globalDateRange} />
      </div>
    </div>
  )
}
