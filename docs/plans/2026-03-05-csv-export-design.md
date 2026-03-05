# CSV Export Contacts - Design

## Overview

Export contacts as CSV from the contacts page, respecting active filters (category, segment, search). Backend generates the CSV via StreamingHttpResponse. Frontend triggers download via blob URL.

## Decisions

- **Format:** CSV only (UTF-8 with BOM for Excel compatibility)
- **Scope:** Exports what the user sees — all contacts, or filtered by category/segment/search
- **Columns:** Fixed predefined set (no column picker)
- **UI:** Dedicated "Exporter" button in the contacts page header + segment detail page
- **Approach:** Backend-side CSV generation via streaming endpoint

---

## 1. API Backend

### Endpoint

`GET /api/contacts/export/`

### Query params

| Param | Type | Description |
|-------|------|-------------|
| category | UUID (optional) | Filter by category |
| segment | UUID (optional) | Filter by segment (uses rule engine) |
| q | string (optional) | Filter by text search |

No params = export all contacts for the organization.

### CSV Columns

```
Prenom,Nom,Email,Telephone,Mobile,Entreprise,Poste,Lead score,Source,Ville,Code postal,Pays,Industrie,Categories,Date de creation
```

- Categories: names joined by ` ; `
- Lead score: French label (Chaud/Tiede/Froid)
- Encoding: UTF-8 with BOM prefix
- Filename: `contacts-export-YYYY-MM-DD.csv`

### Response

StreamingHttpResponse with:
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="contacts-export-YYYY-MM-DD.csv"`

---

## 2. Frontend

### Export button

- Button `variant="outline"` with Download icon (lucide-react)
- Placed in contacts page header between "Importer CSV" and "Ajouter"
- Also added in `/segments/[id]` page header

### Behavior

1. Button shows loading spinner on click
2. `fetch` to `/api/contacts/export/?...` with auth + X-Organization headers
3. Receive blob, create temporary `<a download>` link, trigger click, cleanup
4. Return to normal state

No dialog, no confirmation — direct click = download.

### URL construction

- Segment active: `?segment={id}`
- Category active: `?category={id}`
- Search active: `?q={query}`
- No filter: no params
