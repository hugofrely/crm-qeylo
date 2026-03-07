"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyIcon?: React.ReactNode
  emptyMessage?: string
  onRowClick?: (item: T) => void
  rowKey: (item: T) => string
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyIcon,
  emptyMessage = "Aucun resultat.",
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {emptyIcon}
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-table-header-bg hover:bg-table-header-bg">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]",
                  col.headerClassName
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={rowKey(item)}
              className={cn(
                "transition-all duration-200",
                onRowClick && "cursor-pointer hover:shadow-md hover:border-primary/30"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
