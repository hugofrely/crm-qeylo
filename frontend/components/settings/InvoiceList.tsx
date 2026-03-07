"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, FileText } from "lucide-react"
import type { Invoice } from "@/types/subscriptions"

const statusLabels: Record<string, string> = {
  paid: "Paye",
  open: "En attente",
}

const statusClasses: Record<string, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  open: "bg-amber-50 text-amber-700 border-amber-200",
}

interface InvoiceListProps {
  invoices: Invoice[]
}

export default function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="py-8 text-center font-[family-name:var(--font-body)]">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Aucune facture</p>
      </div>
    )
  }

  return (
    <div className="font-[family-name:var(--font-body)]">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
        Factures
      </h3>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="text-sm">
                  {new Date(invoice.date * 1000).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusClasses[invoice.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}
                  >
                    {statusLabels[invoice.status] ?? invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {invoice.pdf_url && (
                    <a
                      href={invoice.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
