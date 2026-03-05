# Duplicate Detection & Contact Merge - Design

## Context

No mechanism exists to detect and merge duplicate contacts. This feature adds proactive duplicate detection at contact creation/import and a field-by-field merge capability.

## Approach

API-side detection using PostgreSQL `pg_trgm` for fuzzy matching. A dedicated endpoint checks for duplicates before creation. The frontend displays results in a modal dialog with options to continue, cancel, or merge.

## API - Duplicate Detection

### `POST /api/contacts/check-duplicates/`

**Input:** Contact fields (`first_name`, `last_name`, `email`, `phone`, `mobile_phone`, `company`, `siret`).

**Scoring logic (default criteria):**

| Criterion | Condition | Score |
|---|---|---|
| Email exact | `email` or `secondary_email` matches existing contact | 0.9 |
| SIRET exact | `siret` matches | 0.8 |
| Phone exact | `phone` or `mobile_phone` matches | 0.7 |
| Name fuzzy | Trigram similarity on `first_name + last_name` above threshold | proportional (0.0-1.0) |
| Company fuzzy | Trigram similarity on `company` | bonus +0.1 |

Final score = max of individual scores. Returns contacts above threshold (default 0.5), sorted by score descending, limited to 5.

**Output:**
```json
{
  "duplicates": [
    {
      "contact": { /* ContactSerializer */ },
      "score": 0.92,
      "matched_on": ["email"]
    }
  ]
}
```

## API - Contact Merge

### `POST /api/contacts/{id}/merge/`

**Input:**
```json
{
  "duplicate_id": "uuid",
  "field_overrides": {
    "phone": "value-from-duplicate",
    "company": "value-from-duplicate"
  }
}
```

**Logic (atomic transaction):**
1. Contact `{id}` = primary (kept), `duplicate_id` = secondary (deleted)
2. `field_overrides` values are applied to the primary contact
3. Transfer linked data:
   - `Deal.objects.filter(contact=duplicate).update(contact=primary)`
   - `Task.objects.filter(contact=duplicate).update(contact=primary)`
   - `TimelineEntry.objects.filter(contact=duplicate).update(contact=primary)`
   - Categories: union (add duplicate's categories to primary)
   - Tags & interests: merge (union, no duplicates)
   - Custom fields: fill gaps (duplicate values only where primary is empty)
4. Create `TimelineEntry` type `CONTACT_MERGED` on primary
5. Delete duplicate contact

**Output:** Updated primary contact (full serialization).

## Settings Model

### `DuplicateDetectionSettings` (linked to Organization, OneToOne)

| Field | Type | Default |
|---|---|---|
| `enabled` | bool | `true` |
| `match_email` | bool | `true` |
| `match_name` | bool | `true` |
| `match_phone` | bool | `false` |
| `match_siret` | bool | `false` |
| `match_company` | bool | `false` |
| `similarity_threshold` | float | `0.6` |

## Frontend - Duplicate Detection Dialog

### Flow

1. User fills contact creation form, clicks "Create"
2. Frontend calls `POST /contacts/check-duplicates/` with form data
3. If no duplicates: proceed with creation
4. If duplicates found: show `DuplicateDetectionDialog`

### Dialog content

- Message: "X similar contact(s) found"
- List of potential duplicates with score badge ("Very likely" / "Possible")
- Each duplicate shows: name, email, company, phone; matched fields highlighted
- 3 actions:
  - **"Create anyway"** -> proceed with creation
  - **"Cancel"** -> back to form
  - **"Merge with this contact"** -> opens merge view

### Merge view (same modal)

- Two-column comparison: "Existing contact" | "New contact"
- Radio buttons for each field where values differ
- Default: existing contact values selected, except when empty (new value pre-selected)
- "Merge" button calls `POST /contacts/{id}/merge/`

## Frontend - Settings

New section "Duplicate detection" in settings page:
- Global on/off toggle
- Checkboxes for each matching criterion
- Slider/input for similarity threshold (0.4 to 0.9)

## CSV Import

- Enrich existing email-based detection with fuzzy matching from the new engine
- Duplicates are skipped (no interactive merge in bulk import)
- Skipped duplicates listed in import result with match reason

## Chat AI Integration

- Replace basic name-exact detection in `create_contact()` tool with `check-duplicates` endpoint
- Agent informs user of potential duplicates and suggests viewing existing contact

## Database Migration

- Enable `pg_trgm` extension via Django migration
- Create `DuplicateDetectionSettings` model
- Add `CONTACT_MERGED` to `TimelineEntry` entry types
