# Multi-Pipeline - Design

## Overview

Allow organizations to have multiple sales pipelines (prospection, upsell, partnerships, etc.) instead of the current single pipeline. Each pipeline has its own stages and deals. Includes predefined templates and fully custom pipelines.

## Decisions

- **Navigation:** Tabs above the Kanban board, one tab per pipeline
- **Settings:** List of pipelines with drill-down into stages per pipeline
- **Templates:** 3 predefined templates (Prospection, Upsell, Partenariats) + empty custom option
- **Migration:** Existing stages/deals auto-migrated to a "Principal" default pipeline
- **Deletion:** Pipeline with deals requires migration to another pipeline; cannot delete last pipeline

---

## 1. Data Model

### New model: Pipeline

```
Pipeline
  id          UUID PK
  organization FK → Organization
  name        CharField(150)
  order       IntegerField (default 0)
  is_default  BooleanField (default False)
  created_at  DateTimeField
```

### Modified model: PipelineStage

- Remove `organization` FK
- Add `pipeline` FK → Pipeline (CASCADE)
- Organization deduced via `stage.pipeline.organization`

### Deal (unchanged)

- Still points to `PipelineStage` via FK
- Pipeline deduced via `deal.stage.pipeline`

### Data migration

1. Create one `Pipeline(name="Principal", is_default=True)` per organization
2. Assign all existing `PipelineStage` records to their org's new pipeline
3. Drop `organization` column from `PipelineStage`

### Pipeline templates

| Template | Stages |
|----------|--------|
| Prospection | Premier contact, Qualification, Proposition, Negociation, Gagne, Perdu |
| Upsell | Identification, Proposition, Decision, Gagne, Perdu |
| Partenariats | Prise de contact, Evaluation, Negociation, Signe, Abandonne |
| Vide | (no stages, user creates them) |

---

## 2. API Backend

### Pipeline CRUD

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pipelines/` | GET | List pipelines for org (ordered by `order`) |
| `/api/pipelines/` | POST | Create pipeline (`name`, optional `template`) |
| `/api/pipelines/{id}/` | PATCH | Update pipeline (name, is_default) |
| `/api/pipelines/{id}/` | DELETE | Delete pipeline (`?migrate_to={id}` required if has deals) |
| `/api/pipelines/reorder/` | POST | Reorder pipelines (`{ order: [id, id, ...] }`) |

### Modified endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/deals/pipeline/` | Add `?pipeline={id}` param. If absent, returns default pipeline. |
| `GET /api/pipeline-stages/` | Add `?pipeline={id}` param. Required. |
| `POST /api/pipeline-stages/` | Body must include `pipeline` (UUID) |

### Pipeline deletion logic

- If pipeline has deals and no `migrate_to` param → 409 Conflict
- If `migrate_to` provided → move all deals to the first stage of target pipeline
- Cannot delete last pipeline → 400 Bad Request
- If deleted pipeline was default → first remaining pipeline becomes default

---

## 3. Frontend - Deals Page

### Pipeline tabs

- Horizontal tabs above the Kanban board
- Each tab shows pipeline name
- Active tab = currently displayed pipeline
- "+" button at the end of tabs → opens create pipeline dialog
- First load: select default pipeline (is_default=true)

### Create pipeline dialog

- Name field (required)
- Template selector: 4 cards (Prospection, Upsell, Partenariats, Vide)
- Create button

### KanbanBoard changes

- Receives `pipelineId` prop
- Fetches `GET /api/deals/pipeline/?pipeline={pipelineId}`
- DealDialog shows stages filtered by current pipeline

---

## 4. Frontend - Settings Pipeline Page

### Pipeline list view (new)

- Cards for each pipeline: name, stage count, "par defaut" badge
- Click → navigates to stage config for that pipeline
- Actions: rename (inline edit), delete, set as default
- "Nouveau pipeline" button → same create dialog as deals page

### Stage config view (existing, modified)

- Back button to return to pipeline list
- Shows pipeline name as header
- Stage CRUD + reorder (unchanged functionality)
- Stages scoped to selected pipeline

### Delete pipeline dialog

- If pipeline has deals: "Ce pipeline contient X deals. Choisir un pipeline de destination :" + dropdown of other pipelines
- If no deals: simple confirmation
- Cannot delete last pipeline (button disabled with tooltip)

---

## 5. Signup / Org creation

- `PipelineStage.create_defaults(org)` → replaced by `Pipeline.create_defaults(org)` which creates one "Principal" pipeline with the 6 default stages
