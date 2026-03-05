# Produits & Lignes de Devis — Design

## Goal

Add a product catalog and structured quote system to deals, replacing the single "amount" field with detailed line items. Generate PDF quotes via WeasyPrint.

## Architecture

- **New app `products`**: Product catalog (Product, ProductCategory) — independent, reusable
- **Extended app `deals`**: Quote and QuoteLine models tied to Deal
- **Frontend**: New `/deals/[id]` page with quote management, new `/products` page for catalog

## Data Models

### App `products`

**ProductCategory**
- `id` (UUID), `organization` (FK), `name` (max 100), `order` (int), `created_at`

**Product**
- `id` (UUID), `organization` (FK)
- `name` (max 255), `description` (text, optional)
- `reference` (max 50, optional — SKU/code)
- `category` (FK -> ProductCategory, nullable)
- `unit_price` (Decimal 12,2)
- `unit` — choices: `unit`, `hour`, `day`, `fixed`
- `tax_rate` (Decimal 5,2 — e.g. 20.00 for 20%)
- `is_active` (bool, default true)
- `created_at`, `updated_at`

### App `deals` (extension)

**Quote**
- `id` (UUID), `deal` (FK -> Deal), `organization` (FK)
- `number` (auto-incremented per org, e.g. DEV-2026-001)
- `status`: `draft` | `sent` | `accepted` | `refused`
- `global_discount_percent` (Decimal 5,2, default 0)
- `global_discount_amount` (Decimal 12,2, default 0)
- `notes` (text, optional — terms, legal mentions)
- `valid_until` (date, nullable)
- `created_at`, `updated_at`

**QuoteLine**
- `id` (UUID), `quote` (FK -> Quote)
- `product` (FK -> Product, nullable — null = free-form line)
- `description` (text — pre-filled from product if linked)
- `quantity` (Decimal 10,2)
- `unit_price` (Decimal 12,2 — copied from product, editable)
- `unit` (same choices as Product)
- `tax_rate` (Decimal 5,2)
- `discount_percent` (Decimal 5,2, default 0)
- `discount_amount` (Decimal 12,2, default 0)
- `order` (int)

### Calculated properties (not stored)

- Line: `line_subtotal = qty * unit_price`, `line_discount`, `line_ht`, `line_tax`, `line_ttc`
- Quote: `subtotal_ht`, `total_discount`, `total_ht`, `total_tax`, `total_ttc`
- When a quote status changes to `accepted`, `deal.amount` is updated automatically

## API Endpoints

### Products `/api/products/`

| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `/api/products/` | List/Create (filterable: `?category=`, `?active=true`, `?search=`) |
| GET/PATCH/DELETE | `/api/products/{id}/` | Detail/Update/Delete |
| GET/POST | `/api/product-categories/` | List/Create categories |
| PATCH/DELETE | `/api/product-categories/{id}/` | Update/Delete category |

### Quotes `/api/quotes/`

| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `/api/quotes/?deal={id}` | List quotes for a deal / Create |
| GET/PATCH/DELETE | `/api/quotes/{id}/` | Detail (with lines) / Update / Delete |
| POST | `/api/quotes/{id}/duplicate/` | Duplicate quote (for revision) |
| POST | `/api/quotes/{id}/send/` | Set status to `sent` |
| POST | `/api/quotes/{id}/accept/` | Set status to `accepted`, update deal.amount |
| POST | `/api/quotes/{id}/refuse/` | Set status to `refused` |
| GET | `/api/quotes/{id}/pdf/` | Generate and return PDF |

### Quote lines — nested in Quote serializer

Lines are managed as nested writes in the Quote serializer (no separate endpoint):
```json
{
  "notes": "Valable 30 jours",
  "lines": [
    { "product": "uuid", "quantity": 5, "unit_price": "100.00", ... },
    { "description": "Custom service", "quantity": 1, ... }
  ]
}
```

### Deal detail enriched

- `GET /api/deals/{id}/` — adds `quotes_count` and `accepted_quote_total`

## Frontend UI

### Page `/deals/[id]` — Deal detail

Two-column layout:
- **Left (2/3)**: tabs "Devis" and "Notes/Timeline"
- **Right (1/3)**: sidebar with deal info (name, stage, contact, probability, close date, amount)

**Devis tab:**
- List of quotes with status badge (Brouillon/Envoye/Accepte/Refuse), number, date, total TTC
- "+ Nouveau devis" button
- Click quote -> inline editable view with line items table
- Each line: product autocomplete or free-form, quantity, unit price, unit, tax rate, discount, line total
- "+ Ajouter une ligne" at bottom
- Totals bar: subtotal HT, global discount, total HT, TVA, TTC
- Quote actions: Duplicate, Send, Accept, Refuse, Download PDF, Delete

### Page `/products` — Catalog (sidebar nav)

- Paginated list with search + category filter + active/archived filter
- Each row: reference, name, category, unit price, unit, tax rate, active/archived badge
- Dialog for create/edit product
- Category management in Settings or inline

### Kanban -> Deal detail navigation

- Click DealCard in Kanban -> `router.push(/deals/${id})` instead of DealDialog
- DealDialog stays for quick creation from Kanban

### PDF Quote

- HTML/CSS template rendered by WeasyPrint (backend)
- Content: org logo, org address, contact address, quote number, date, validity, line items table, totals, notes/terms
- Download via `GET /api/quotes/{id}/pdf/` -> blob download

## Discount system

- **Per-line**: `discount_percent` OR `discount_amount` (mutually exclusive per line)
- **Global**: `global_discount_percent` OR `global_discount_amount` on Quote
- Both cumulate: line discounts applied first, then global discount on subtotal
