# Activities / Interaction History — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the TimelineEntry model with rich activity types (call, email_sent, email_received, meeting, custom) and add a logging dialog on the contact detail page.

**Architecture:** Extend the existing `TimelineEntry` model (backend/notes/) with new entry_type choices and a `subject` field. Add a new `POST /api/activities/` endpoint with per-type metadata validation. Create an `ActivityDialog` React component on the contact detail page with dynamic forms per activity type and enriched timeline display.

**Tech Stack:** Django REST Framework, Next.js, TypeScript, shadcn/ui (Tabs, Dialog, Input, Select), Lucide icons

---

### Task 1: Add new entry types and subject field to TimelineEntry model

**Files:**
- Modify: `backend/notes/models.py:7-14` (EntryType choices)
- Modify: `backend/notes/models.py:42` (add subject field after content)

**Step 1: Add new entry types to EntryType choices**

In `backend/notes/models.py`, replace the `EntryType` class:

```python
class EntryType(models.TextChoices):
    CONTACT_CREATED = "contact_created"
    DEAL_CREATED = "deal_created"
    DEAL_MOVED = "deal_moved"
    NOTE_ADDED = "note_added"
    TASK_CREATED = "task_created"
    CHAT_ACTION = "chat_action"
    CONTACT_UPDATED = "contact_updated"
    CALL = "call"
    EMAIL_SENT = "email_sent"
    EMAIL_RECEIVED = "email_received"
    MEETING = "meeting"
    CUSTOM = "custom"
```

**Step 2: Add subject field**

After the `content` field (line 42), add:

```python
subject = models.CharField(max_length=255, blank=True, null=True)
```

**Step 3: Generate and apply migration**

Run:
```bash
cd backend && python manage.py makemigrations notes && python manage.py migrate
```
Expected: Migration created and applied successfully.

**Step 4: Commit**

```bash
git add backend/notes/models.py backend/notes/migrations/
git commit -m "feat(models): add activity entry types and subject field to TimelineEntry"
```

---

### Task 2: Add ActivityCreateSerializer with per-type metadata validation

**Files:**
- Modify: `backend/notes/serializers.py` (add ActivityCreateSerializer)

**Step 1: Add ActivityCreateSerializer**

Append to `backend/notes/serializers.py`:

```python
class ActivityCreateSerializer(serializers.Serializer):
    ACTIVITY_TYPES = ["call", "email_sent", "email_received", "meeting", "custom"]

    entry_type = serializers.ChoiceField(choices=[(t, t) for t in ACTIVITY_TYPES])
    contact = serializers.UUIDField()
    deal = serializers.UUIDField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    content = serializers.CharField(required=False, allow_blank=True, default="")
    metadata = serializers.JSONField(required=False, default=dict)

    def validate(self, data):
        entry_type = data["entry_type"]
        metadata = data.get("metadata", {})

        if entry_type == "call":
            if "direction" not in metadata:
                raise serializers.ValidationError({"metadata": "Le champ 'direction' est requis pour un appel."})
            if metadata["direction"] not in ("inbound", "outbound"):
                raise serializers.ValidationError({"metadata": "'direction' doit être 'inbound' ou 'outbound'."})
            if "outcome" not in metadata:
                raise serializers.ValidationError({"metadata": "Le champ 'outcome' est requis pour un appel."})
            if metadata["outcome"] not in ("answered", "voicemail", "no_answer", "busy"):
                raise serializers.ValidationError({"metadata": "'outcome' doit être 'answered', 'voicemail', 'no_answer' ou 'busy'."})

        elif entry_type in ("email_sent", "email_received"):
            if not metadata.get("subject"):
                raise serializers.ValidationError({"metadata": "Le champ 'subject' est requis pour un email."})

        elif entry_type == "meeting":
            if not metadata.get("title"):
                raise serializers.ValidationError({"metadata": "Le champ 'title' est requis pour une réunion."})
            if not metadata.get("scheduled_at"):
                raise serializers.ValidationError({"metadata": "Le champ 'scheduled_at' est requis pour une réunion."})

        elif entry_type == "custom":
            if not metadata.get("custom_type_label"):
                raise serializers.ValidationError({"metadata": "Le champ 'custom_type_label' est requis pour un type custom."})

        return data
```

**Step 2: Commit**

```bash
git add backend/notes/serializers.py
git commit -m "feat(serializers): add ActivityCreateSerializer with per-type validation"
```

---

### Task 3: Add create_activity view and URL

**Files:**
- Modify: `backend/notes/views.py` (add create_activity view)
- Modify: `backend/notes/serializers.py:8` (add import)
- Modify: `backend/config/urls.py` (add activities URL)
- Create: `backend/notes/activity_urls.py`

**Step 1: Add create_activity view**

Append to `backend/notes/views.py`:

```python
from .serializers import ActivityCreateSerializer  # add to existing imports

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_activity(request):
    serializer = ActivityCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    entry = TimelineEntry.objects.create(
        organization=request.organization,
        created_by=request.user,
        contact_id=data["contact"],
        deal_id=data.get("deal"),
        entry_type=data["entry_type"],
        subject=data.get("subject", ""),
        content=data.get("content", ""),
        metadata=data.get("metadata", {}),
    )
    return Response(
        TimelineEntrySerializer(entry).data,
        status=status.HTTP_201_CREATED,
    )
```

**Step 2: Create activity_urls.py**

Create `backend/notes/activity_urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [path("", views.create_activity)]
```

**Step 3: Register URL in config/urls.py**

Add this line in `backend/config/urls.py` after the notes URL (line 14):

```python
path("api/activities/", include("notes.activity_urls")),
```

**Step 4: Add subject to TimelineEntrySerializer**

In `backend/notes/serializers.py`, add `"subject"` to the `TimelineEntrySerializer.Meta.fields` list and `read_only_fields`:

```python
fields = [
    "id",
    "contact",
    "deal",
    "entry_type",
    "subject",
    "content",
    "metadata",
    "created_at",
]
read_only_fields = ["id", "entry_type", "created_at"]
```

**Step 5: Commit**

```bash
git add backend/notes/views.py backend/notes/activity_urls.py backend/notes/serializers.py backend/config/urls.py
git commit -m "feat(api): add POST /api/activities/ endpoint"
```

---

### Task 4: Add backend tests for activities API

**Files:**
- Modify: `backend/notes/tests.py`

**Step 1: Add activity tests**

Append to `backend/notes/tests.py`:

```python
class ActivityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "activity@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        contact_resp = self.client.post(
            "/api/contacts/",
            {"first_name": "Marie", "last_name": "Dupont"},
        )
        self.contact_id = contact_resp.data["id"]

    def test_create_call_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "call",
                "contact": self.contact_id,
                "subject": "Appel de suivi",
                "content": "Discussion sur le projet",
                "metadata": {
                    "direction": "outbound",
                    "duration_minutes": 15,
                    "outcome": "answered",
                    "phone_number": "+33612345678",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["entry_type"], "call")
        self.assertEqual(response.data["metadata"]["direction"], "outbound")

    def test_create_call_missing_direction_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "call",
                "contact": self.contact_id,
                "metadata": {"outcome": "answered"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_email_sent_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "email_sent",
                "contact": self.contact_id,
                "content": "Sent follow-up email",
                "metadata": {
                    "subject": "Follow-up",
                    "recipients": ["marie@example.com"],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_email_missing_subject_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "email_sent",
                "contact": self.contact_id,
                "metadata": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_meeting_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "meeting",
                "contact": self.contact_id,
                "content": "Product demo",
                "metadata": {
                    "title": "Demo produit",
                    "scheduled_at": "2026-03-10T14:00:00Z",
                    "duration_minutes": 60,
                    "location": "Zoom",
                    "participants": ["Marie Dupont"],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_custom_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "custom",
                "contact": self.contact_id,
                "content": "Lunch with client",
                "metadata": {"custom_type_label": "Déjeuner"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_custom_missing_label_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "custom",
                "contact": self.contact_id,
                "metadata": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activity_shows_in_timeline(self):
        self.client.post(
            "/api/activities/",
            {
                "entry_type": "call",
                "contact": self.contact_id,
                "subject": "Call",
                "metadata": {
                    "direction": "inbound",
                    "outcome": "answered",
                },
            },
            format="json",
        )
        response = self.client.get(f"/api/timeline/?contact={self.contact_id}")
        self.assertTrue(any(e["entry_type"] == "call" for e in response.data))

    def test_invalid_entry_type_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "note_added",
                "contact": self.contact_id,
                "metadata": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

**Step 2: Run tests**

```bash
cd backend && python manage.py test notes -v2
```
Expected: All tests pass.

**Step 3: Commit**

```bash
git add backend/notes/tests.py
git commit -m "test: add activity API tests"
```

---

### Task 5: Create ActivityDialog frontend component

**Files:**
- Create: `frontend/components/activities/ActivityDialog.tsx`

**Step 1: Create the ActivityDialog component**

Create `frontend/components/activities/ActivityDialog.tsx` with:
- A Dialog wrapping a form
- Props: `contactId: string`, `contactEmail?: string`, `contactPhone?: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onCreated: () => void`
- Tabs component for activity type selection: Call, Email envoyé, Email reçu, Réunion, Custom
- Dynamic form per tab with the fields from the design doc
- Submit calls `POST /api/activities/` via `apiFetch`
- On success, calls `onCreated()` callback and closes dialog
- Loading state on submit button

The component should use these shadcn/ui components (already available):
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- `Input` from `@/components/ui/input`
- `Label` from `@/components/ui/label`
- `Button` from `@/components/ui/button`
- Icons from `lucide-react`: `Phone`, `Mail`, `MailOpen`, `Calendar`, `Tag`, `Loader2`

Form fields per tab:

**Call tab:**
- Direction: `<select>` with Entrant/Sortant
- Durée (minutes): `<Input type="number">`
- Résultat: `<select>` with Répondu/Messagerie/Pas de réponse/Occupé
- Numéro: `<Input>` pre-filled with `contactPhone`
- Notes: `<textarea>`

**Email envoyé tab:**
- Sujet: `<Input>` (required)
- Destinataires: `<Input>` pre-filled with `contactEmail`
- Corps/Résumé: `<textarea>`

**Email reçu tab:**
- Sujet: `<Input>` (required)
- Expéditeur: `<Input>` pre-filled with `contactEmail`
- Corps/Résumé: `<textarea>`

**Réunion tab:**
- Titre: `<Input>` (required)
- Date et heure: `<Input type="datetime-local">`
- Durée (minutes): `<Input type="number">`
- Lieu: `<Input>`
- Participants: `<Input>`
- Notes: `<textarea>`

**Custom tab:**
- Type label: `<Input>` (required, placeholder: "Déjeuner, Salon, Démo...")
- Description: `<textarea>`

On submit, build the payload:
```typescript
const payload = {
  entry_type: activeTab,
  contact: contactId,
  subject: subject,
  content: content,
  metadata: { ...type-specific fields },
}
await apiFetch("/activities/", { method: "POST", json: payload })
```

**Step 2: Commit**

```bash
git add frontend/components/activities/ActivityDialog.tsx
git commit -m "feat(frontend): add ActivityDialog component with dynamic forms per type"
```

---

### Task 6: Integrate ActivityDialog into contact detail page

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx:560-564` (Timeline section header)

**Step 1: Add state and import**

At the top of the file, add import:
```typescript
import { ActivityDialog } from "@/components/activities/ActivityDialog"
```

In `ContactDetailPage` component, add state:
```typescript
const [activityDialogOpen, setActivityDialogOpen] = useState(false)
```

**Step 2: Add button to timeline header**

Replace the Timeline header section (lines 560-564):

```tsx
{/* Timeline */}
<div className="rounded-xl border border-border bg-card overflow-hidden">
  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
    <h2 className="text-xl tracking-tight">Historique</h2>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setActivityDialogOpen(true)}
      className="gap-2"
    >
      <Phone className="h-3.5 w-3.5" />
      Logger une activité
    </Button>
  </div>
```

**Step 3: Add ActivityDialog below the timeline section**

After the closing `</div>` of the timeline card, add:

```tsx
<ActivityDialog
  contactId={id}
  contactEmail={contact.email}
  contactPhone={contact.phone}
  open={activityDialogOpen}
  onOpenChange={setActivityDialogOpen}
  onCreated={() => fetchTimeline()}
/>
```

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(frontend): integrate ActivityDialog into contact detail page"
```

---

### Task 7: Enrich timeline display with activity metadata

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx` (getTimelineIcon, getTimelineColor, timeline rendering)

**Step 1: Update getTimelineIcon**

Update the function to handle new types:

```typescript
function getTimelineIcon(entryType: string) {
  switch (entryType) {
    case "chat_action":
      return <MessageSquare className="h-3.5 w-3.5" />
    case "note_added":
      return <FileText className="h-3.5 w-3.5" />
    case "deal_created":
    case "deal_moved":
      return <DollarSign className="h-3.5 w-3.5" />
    case "call":
      return <Phone className="h-3.5 w-3.5" />
    case "email_sent":
    case "email_received":
      return <Mail className="h-3.5 w-3.5" />
    case "meeting":
      return <Calendar className="h-3.5 w-3.5" />
    case "contact_updated":
      return <Pencil className="h-3.5 w-3.5" />
    case "custom":
      return <Tag className="h-3.5 w-3.5" />
    default:
      return <Calendar className="h-3.5 w-3.5" />
  }
}
```

**Step 2: Update getTimelineColor**

```typescript
function getTimelineColor(entryType: string) {
  switch (entryType) {
    case "chat_action":
      return "bg-teal-light text-primary"
    case "note_added":
      return "bg-warm-light text-warm"
    case "deal_created":
    case "deal_moved":
      return "bg-green-50 text-green-700"
    case "call":
      return "bg-purple-50 text-purple-700"
    case "email_sent":
    case "email_received":
      return "bg-orange-50 text-orange-700"
    case "meeting":
      return "bg-blue-50 text-blue-700"
    case "contact_updated":
      return "bg-blue-50 text-blue-700"
    case "custom":
      return "bg-secondary text-muted-foreground"
    default:
      return "bg-secondary text-muted-foreground"
  }
}
```

**Step 3: Add activity metadata display in timeline entries**

In the timeline rendering section (around line 584-596), update to show metadata badges after the content. Add a helper function:

```typescript
function ActivityMetadata({ entry }: { entry: TimelineEntry }) {
  const meta = entry.metadata as Record<string, unknown>
  if (!meta || Object.keys(meta).length === 0) return null

  const badges: string[] = []

  switch (entry.entry_type) {
    case "call":
      if (meta.direction) badges.push(meta.direction === "inbound" ? "Entrant" : "Sortant")
      if (meta.outcome) {
        const outcomes: Record<string, string> = { answered: "Répondu", voicemail: "Messagerie", no_answer: "Pas de réponse", busy: "Occupé" }
        badges.push(outcomes[meta.outcome as string] || String(meta.outcome))
      }
      if (meta.duration_minutes) badges.push(`${meta.duration_minutes} min`)
      break
    case "email_sent":
    case "email_received":
      if (meta.subject) badges.push(String(meta.subject))
      break
    case "meeting":
      if (meta.scheduled_at) badges.push(formatDateTime(String(meta.scheduled_at)))
      if (meta.location) badges.push(String(meta.location))
      break
    case "custom":
      if (meta.custom_type_label) badges.push(String(meta.custom_type_label))
      break
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {badges.map((badge, i) => (
        <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {badge}
        </span>
      ))}
    </div>
  )
}
```

Update the entry type Badge to show human-readable labels:

```typescript
function getEntryTypeLabel(entryType: string): string {
  const labels: Record<string, string> = {
    contact_created: "Contact créé",
    deal_created: "Deal créé",
    deal_moved: "Deal déplacé",
    note_added: "Note",
    task_created: "Tâche créée",
    chat_action: "Action chat",
    contact_updated: "Contact modifié",
    call: "Appel",
    email_sent: "Email envoyé",
    email_received: "Email reçu",
    meeting: "Réunion",
    custom: "Activité",
  }
  return labels[entryType] || entryType
}
```

In the timeline render, after the Badge, add subject display and ActivityMetadata:

```tsx
<Badge variant="outline" className="text-[10px] capitalize font-normal">
  {getEntryTypeLabel(entry.entry_type)}
</Badge>
{/* ... existing timestamp ... */}
{entry.subject && (
  <p className="text-sm font-medium mt-1">{entry.subject}</p>
)}
<p className="text-sm mt-1.5 whitespace-pre-wrap break-words leading-relaxed">
  {entry.content}
</p>
<ActivityMetadata entry={entry} />
```

Note: The `TimelineEntry` interface needs the `subject` field added:
```typescript
interface TimelineEntry {
  id: number
  contact: number
  deal: number | null
  entry_type: string
  subject: string | null
  content: string
  metadata: Record<string, unknown>
  created_at: string
}
```

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(frontend): enrich timeline display with activity metadata badges"
```

---

### Task 8: Manual end-to-end testing

**Step 1: Start the app**

```bash
docker compose up
```

**Step 2: Test via browser**

1. Navigate to a contact detail page
2. Click "Logger une activité"
3. Test each tab: Call, Email envoyé, Email reçu, Réunion, Custom
4. Submit each type and verify it appears in the timeline with correct icon, color, and metadata badges
5. Verify validation errors show for missing required fields

**Step 3: Run backend tests**

```bash
cd backend && python manage.py test notes -v2
```
Expected: All tests pass.

**Step 4: Final commit if any fixes needed**

---

### Task 9: Commit all and verify clean state

**Step 1: Run full backend test suite**

```bash
cd backend && python manage.py test -v2
```

**Step 2: Verify git status is clean**

```bash
git status
```
