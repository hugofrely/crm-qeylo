# Lead Scoring, Lead Routing & Recurring Tasks — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automatic lead scoring (0-100), lead routing (round-robin + rules), and recurring task creation to the Qeylo CRM.

**Architecture:** Django signals + Celery beat for backend automation. New models for scoring rules, routing rules, and round-robin state. Frontend settings pages for configuration. All models scoped to organization (multi-tenant).

**Tech Stack:** Django 5 + DRF, Celery, Next.js 14 (React), TypeScript, shadcn/ui components, Tailwind CSS.

---

## Task 1: Lead Scoring — Backend Models & Migration

**Files:**
- Modify: `backend/contacts/models.py`
- Modify: `backend/organizations/models.py`
- Create: `backend/contacts/scoring.py`

**Step 1: Add `numeric_score` field to Contact model**

In `backend/contacts/models.py`, add after the `lead_score` field (line 59):

```python
numeric_score = models.IntegerField(default=0)
```

**Step 2: Add `ScoringRule` model to contacts/models.py**

Add at the end of `backend/contacts/models.py`:

```python
class ScoringRule(models.Model):
    class EventType(models.TextChoices):
        EMAIL_SENT = "email_sent", "Email envoyé"
        EMAIL_OPENED = "email_opened", "Email ouvert"
        EMAIL_CLICKED = "email_clicked", "Email cliqué"
        CALL_MADE = "call_made", "Appel effectué"
        CALL_ANSWERED = "call_answered", "Appel décroché"
        DEAL_CREATED = "deal_created", "Deal créé"
        DEAL_WON = "deal_won", "Deal gagné"
        MEETING = "meeting", "Réunion"
        NOTE_ADDED = "note_added", "Note ajoutée"
        TASK_COMPLETED = "task_completed", "Tâche terminée"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="scoring_rules",
    )
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    points = models.IntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "event_type")
        ordering = ["event_type"]

    def __str__(self):
        return f"{self.event_type}: {self.points:+d} pts"
```

**Step 3: Add scoring thresholds to OrganizationSettings**

In `backend/organizations/models.py`, add to `OrganizationSettings` after `task_reminder_offsets` (line 80):

```python
scoring_hot_threshold = models.IntegerField(default=70)
scoring_warm_threshold = models.IntegerField(default=30)
```

**Step 4: Create the scoring engine**

Create `backend/contacts/scoring.py`:

```python
from django.utils import timezone
from datetime import timedelta


DEFAULT_SCORING_RULES = {
    "email_sent": 5,
    "email_opened": 3,
    "email_clicked": 8,
    "call_made": 5,
    "call_answered": 10,
    "deal_created": 20,
    "deal_won": 30,
    "meeting": 15,
    "note_added": 2,
    "task_completed": 3,
}

DECAY_POINTS_7D = -5
DECAY_POINTS_30D = -15


def create_default_scoring_rules(organization):
    """Create default scoring rules for a new organization."""
    from .models import ScoringRule
    for event_type, points in DEFAULT_SCORING_RULES.items():
        ScoringRule.objects.get_or_create(
            organization=organization,
            event_type=event_type,
            defaults={"points": points},
        )


def recalculate_score(contact):
    """Recalculate numeric_score for a contact based on their activity."""
    from .models import ScoringRule
    from notes.models import TimelineEntry

    org = contact.organization
    rules = {r.event_type: r.points for r in ScoringRule.objects.filter(organization=org, is_active=True)}

    # Map TimelineEntry types to scoring event types
    entry_type_map = {
        "email_sent": "email_sent",
        "email_received": "email_opened",
        "call": "call_made",
        "deal_created": "deal_created",
        "note_added": "note_added",
        "meeting": "meeting",
    }

    # Count activities in the last 90 days
    cutoff = timezone.now() - timedelta(days=90)
    entries = TimelineEntry.objects.filter(
        contact=contact,
        created_at__gte=cutoff,
    ).values_list("entry_type", flat=True)

    score = 0
    for entry_type in entries:
        event = entry_type_map.get(entry_type)
        if event and event in rules:
            score += rules[event]

    # Count answered calls specifically
    from notes.models import Call
    answered_calls = Call.objects.filter(
        contact=contact,
        outcome="answered",
        started_at__gte=cutoff,
    ).count()
    if "call_answered" in rules:
        score += answered_calls * rules["call_answered"]
        # Remove double-counted call_made points for answered calls
        if "call_made" in rules:
            score -= answered_calls * rules["call_made"]

    # Deal won bonus
    from deals.models import Deal
    won_deals = Deal.objects.filter(
        contact=contact,
        won_at__isnull=False,
        won_at__gte=cutoff,
    ).count()
    if "deal_won" in rules:
        score += won_deals * rules["deal_won"]
        # Remove double-counted deal_created for won deals
        if "deal_created" in rules:
            score -= won_deals * rules["deal_created"]

    # Completed tasks bonus
    from tasks.models import Task
    completed_tasks = Task.objects.filter(
        contact=contact,
        is_done=True,
        created_at__gte=cutoff,
    ).count()
    if "task_completed" in rules:
        score += completed_tasks * rules["task_completed"]

    # Inactivity decay
    last_activity = TimelineEntry.objects.filter(contact=contact).order_by("-created_at").first()
    if last_activity:
        days_inactive = (timezone.now() - last_activity.created_at).days
        if days_inactive >= 30:
            score += DECAY_POINTS_30D
        elif days_inactive >= 7:
            score += DECAY_POINTS_7D

    # Clamp 0-100
    score = max(0, min(100, score))

    # Update contact
    contact.numeric_score = score

    # Auto-update lead_score label based on thresholds
    from organizations.models import OrganizationSettings
    try:
        settings = OrganizationSettings.objects.get(organization=org)
        hot = settings.scoring_hot_threshold
        warm = settings.scoring_warm_threshold
    except OrganizationSettings.DoesNotExist:
        hot, warm = 70, 30

    if score >= hot:
        contact.lead_score = "hot"
    elif score >= warm:
        contact.lead_score = "warm"
    else:
        contact.lead_score = "cold"

    contact.save(update_fields=["numeric_score", "lead_score"])
```

**Step 5: Run makemigrations and migrate**

```bash
cd backend && python manage.py makemigrations contacts organizations && python manage.py migrate
```

**Step 6: Commit**

```bash
git add backend/contacts/models.py backend/contacts/scoring.py backend/organizations/models.py backend/contacts/migrations/ backend/organizations/migrations/
git commit -m "feat(scoring): add ScoringRule model, numeric_score field, and scoring engine"
```

---

## Task 2: Lead Scoring — Signals & Celery Task

**Files:**
- Create: `backend/contacts/signals.py`
- Modify: `backend/contacts/apps.py`
- Modify: `backend/tasks/celery_tasks.py`

**Step 1: Create signals for score recalculation**

Create `backend/contacts/signals.py`:

```python
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="notes.TimelineEntry")
def recalculate_score_on_timeline(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.contact_id:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)


@receiver(post_save, sender="notes.Call")
def recalculate_score_on_call(sender, instance, created, **kwargs):
    if not created:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)


@receiver(post_save, sender="deals.Deal")
def recalculate_score_on_deal(sender, instance, created, **kwargs):
    if not instance.contact_id:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)
```

**Step 2: Register signals in apps.py**

In `backend/contacts/apps.py`, add the `ready` method:

```python
from django.apps import AppConfig


class ContactsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "contacts"

    def ready(self):
        import contacts.signals  # noqa: F401
```

**Step 3: Add daily decay Celery task**

Add to `backend/tasks/celery_tasks.py` (at the end):

```python
@shared_task
def apply_scoring_decay():
    """Daily task: recalculate scores for all contacts to apply inactivity decay."""
    from contacts.models import Contact
    from contacts.scoring import recalculate_score

    for org in Organization.objects.all():
        contacts = Contact.objects.filter(organization=org, numeric_score__gt=0)
        for contact in contacts.iterator():
            recalculate_score(contact)
```

**Step 4: Commit**

```bash
git add backend/contacts/signals.py backend/contacts/apps.py backend/tasks/celery_tasks.py
git commit -m "feat(scoring): add signals for auto-recalculation and daily decay task"
```

---

## Task 3: Lead Scoring — API Endpoints

**Files:**
- Modify: `backend/contacts/serializers.py`
- Modify: `backend/contacts/views.py`
- Modify: `backend/contacts/urls.py`

**Step 1: Add `numeric_score` to ContactSerializer**

In `backend/contacts/serializers.py`, add `"numeric_score"` to the `fields` list in `ContactSerializer.Meta` (after `"lead_score"`).

**Step 2: Add ScoringRule serializer**

Add to `backend/contacts/serializers.py`:

```python
from .models import ScoringRule


class ScoringRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringRule
        fields = ["id", "event_type", "points", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
```

**Step 3: Add scoring settings API view**

Add to `backend/contacts/views.py`:

```python
from .models import ScoringRule
from .serializers import ScoringRuleSerializer


class ScoringRuleViewSet(viewsets.ModelViewSet):
    serializer_class = ScoringRuleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ScoringRule.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)
```

**Step 4: Add `numeric_score` ordering support**

In `backend/contacts/views.py`, add `"numeric_score"` and `"-numeric_score"` to `ALLOWED_ORDERING`.

**Step 5: Register URL**

In `backend/contacts/urls.py`, add:

```python
scoring_router = DefaultRouter()
scoring_router.register("", views.ScoringRuleViewSet, basename="scoring-rule")
```

And add to `urlpatterns` (before the catch-all `""` route):

```python
path("scoring-rules/", include(scoring_router.urls)),
```

**Step 6: Commit**

```bash
git add backend/contacts/serializers.py backend/contacts/views.py backend/contacts/urls.py
git commit -m "feat(scoring): add scoring rules API and numeric_score to contact serializer"
```

---

## Task 4: Lead Scoring — Frontend Settings Page

**Files:**
- Create: `frontend/services/scoring.ts`
- Create: `frontend/components/settings/ScoringSettings.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx`
- Modify: `frontend/types/contacts.ts`

**Step 1: Add types**

Add to `frontend/types/contacts.ts`:

```typescript
export interface ScoringRule {
  id: string
  event_type: string
  points: number
  is_active: boolean
  created_at: string
}
```

And add `numeric_score: number` to the `Contact` interface (after `lead_score`).

**Step 2: Create scoring service**

Create `frontend/services/scoring.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { ScoringRule } from "@/types/contacts"

export async function fetchScoringRules(): Promise<ScoringRule[]> {
  return apiFetch<ScoringRule[]>("/contacts/scoring-rules/")
}

export async function updateScoringRule(
  id: string,
  data: Partial<ScoringRule>
): Promise<ScoringRule> {
  return apiFetch<ScoringRule>(`/contacts/scoring-rules/${id}/`, {
    method: "PATCH",
    json: data,
  })
}

export async function createScoringRule(
  data: Pick<ScoringRule, "event_type" | "points">
): Promise<ScoringRule> {
  return apiFetch<ScoringRule>("/contacts/scoring-rules/", {
    method: "POST",
    json: data,
  })
}
```

**Step 3: Create ScoringSettings component**

Create `frontend/components/settings/ScoringSettings.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Flame, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchScoringRules, updateScoringRule } from "@/services/scoring"
import { fetchOrgSettings, updateOrgSettings } from "@/services/organizations"
import type { ScoringRule } from "@/types/contacts"
import { toast } from "sonner"

const EVENT_LABELS: Record<string, string> = {
  email_sent: "Email envoyé",
  email_opened: "Email ouvert",
  email_clicked: "Email cliqué",
  call_made: "Appel effectué",
  call_answered: "Appel décroché",
  deal_created: "Deal créé",
  deal_won: "Deal gagné",
  meeting: "Réunion",
  note_added: "Note ajoutée",
  task_completed: "Tâche terminée",
}

interface ScoringSettingsProps {
  orgId: string
}

export default function ScoringSettings({ orgId }: ScoringSettingsProps) {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [hotThreshold, setHotThreshold] = useState(70)
  const [warmThreshold, setWarmThreshold] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchScoringRules(),
      fetchOrgSettings(orgId),
    ]).then(([rulesData, settings]) => {
      setRules(rulesData)
      setHotThreshold((settings as Record<string, number>).scoring_hot_threshold ?? 70)
      setWarmThreshold((settings as Record<string, number>).scoring_warm_threshold ?? 30)
    }).catch(() => {
      toast.error("Erreur lors du chargement des règles de scoring")
    }).finally(() => setLoading(false))
  }, [orgId])

  const handlePointsChange = async (rule: ScoringRule, points: number) => {
    setSaving(true)
    try {
      await updateScoringRule(rule.id, { points })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, points } : r)))
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (rule: ScoringRule, is_active: boolean) => {
    setSaving(true)
    try {
      await updateScoringRule(rule.id, { is_active })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active } : r)))
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const handleThresholdSave = async () => {
    setSaving(true)
    try {
      await updateOrgSettings(orgId, {
        scoring_hot_threshold: hotThreshold,
        scoring_warm_threshold: warmThreshold,
      } as Record<string, unknown>)
      toast.success("Seuils mis à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl tracking-tight">Lead scoring</h2>
            <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
              Attribuez des points automatiquement selon les activités des contacts
            </p>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
        </div>
      </div>

      <div className="p-6 space-y-6 font-[family-name:var(--font-body)]">
        {/* Scoring rules table */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Points par activité
          </p>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={rule.is_active}
                    onCheckedChange={(checked) => handleToggle(rule, !!checked)}
                  />
                  <span className="text-sm">{EVENT_LABELS[rule.event_type] || rule.event_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rule.points}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val)) {
                        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, points: val } : r)))
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val)) handlePointsChange(rule, val)
                    }}
                    className="w-20 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Thresholds */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Seuils de qualification
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                Chaud (HOT) ≥
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={hotThreshold}
                onChange={(e) => setHotThreshold(parseInt(e.target.value, 10) || 0)}
                onBlur={handleThresholdSave}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
                Tiède (WARM) ≥
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={warmThreshold}
                onChange={(e) => setWarmThreshold(parseInt(e.target.value, 10) || 0)}
                onBlur={handleThresholdSave}
                className="h-8"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            En dessous de {warmThreshold} = Froid (COLD)
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Add ScoringSettings to the settings page**

In `frontend/app/(app)/settings/page.tsx`, import and add the component in the "Paramètres" sub-tab, after `ReminderSettings`:

```tsx
import ScoringSettings from "@/components/settings/ScoringSettings"
```

Add after `{orgId && <ReminderSettings orgId={orgId} />}`:

```tsx
{orgId && <ScoringSettings orgId={orgId} />}
```

**Step 5: Commit**

```bash
git add frontend/types/contacts.ts frontend/services/scoring.ts frontend/components/settings/ScoringSettings.tsx frontend/app/\(app\)/settings/page.tsx
git commit -m "feat(scoring): add scoring settings UI and service"
```

---

## Task 5: Lead Scoring — Display Score on Contact

**Files:**
- Modify: `frontend/components/contacts/ContactHeader.tsx`

**Step 1: Add score badge to ContactHeader**

Read the current `ContactHeader.tsx` first, then add a score badge near the lead_score display. The badge should show the numeric score with color based on lead_score:
- `hot` → red/orange gradient
- `warm` → yellow/orange
- `cold` → blue/gray

Add this component inline:

```tsx
{contact.numeric_score !== undefined && (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
    contact.lead_score === "hot" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    contact.lead_score === "warm" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    (contact.lead_score === "cold" || !contact.lead_score) && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  )}>
    {contact.numeric_score}/100
  </span>
)}
```

**Step 2: Commit**

```bash
git add frontend/components/contacts/ContactHeader.tsx
git commit -m "feat(scoring): display numeric score badge on contact header"
```

---

## Task 6: Lead Routing — Backend Models & Migration

**Files:**
- Modify: `backend/contacts/models.py`
- Create: `backend/contacts/routing.py`

**Step 1: Add `owner` field to Contact model**

In `backend/contacts/models.py`, add after the `created_by` field (line 33):

```python
owner = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="owned_contacts",
)
```

**Step 2: Add LeadRoutingRule model**

Add to `backend/contacts/models.py`:

```python
class LeadRoutingRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="routing_rules",
    )
    name = models.CharField(max_length=150)
    priority = models.IntegerField(default=0)
    conditions = models.JSONField(default=dict)
    assign_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="routing_rules",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["priority"]

    def __str__(self):
        return self.name
```

**Step 3: Add RoundRobinState model**

Add to `backend/contacts/models.py`:

```python
class RoundRobinState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="round_robin_state",
    )
    last_assigned_index = models.IntegerField(default=0)
    eligible_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="round_robin_eligible",
    )

    def __str__(self):
        return f"RoundRobin({self.organization})"
```

**Step 4: Create routing engine**

Create `backend/contacts/routing.py`:

```python
def match_conditions(contact, conditions):
    """Check if a contact matches a routing rule's conditions."""
    for field, expected in conditions.items():
        if field == "source" and contact.source != expected:
            return False
        elif field == "industry" and contact.industry != expected:
            return False
        elif field == "country" and contact.country != expected:
            return False
        elif field == "estimated_budget_gte":
            if contact.estimated_budget is None or contact.estimated_budget < expected:
                return False
        elif field == "estimated_budget_lte":
            if contact.estimated_budget is None or contact.estimated_budget > expected:
                return False
        elif field == "tags_contains":
            if not isinstance(expected, list):
                expected = [expected]
            if not any(tag in (contact.tags or []) for tag in expected):
                return False
    return True


def route_lead(contact):
    """Assign an owner to a newly created contact using rules or round-robin."""
    from .models import LeadRoutingRule, RoundRobinState

    org = contact.organization

    # 1. Try rule-based routing
    rules = LeadRoutingRule.objects.filter(
        organization=org, is_active=True
    ).select_related("assign_to").order_by("priority")

    for rule in rules:
        if match_conditions(contact, rule.conditions):
            contact.owner = rule.assign_to
            contact.save(update_fields=["owner"])
            return

    # 2. Fall back to round-robin
    state, _ = RoundRobinState.objects.get_or_create(organization=org)
    eligible = list(state.eligible_users.all().order_by("id"))

    if not eligible:
        return

    idx = state.last_assigned_index % len(eligible)
    contact.owner = eligible[idx]
    contact.save(update_fields=["owner"])

    state.last_assigned_index = (idx + 1) % len(eligible)
    state.save(update_fields=["last_assigned_index"])
```

**Step 5: Run migration**

```bash
cd backend && python manage.py makemigrations contacts && python manage.py migrate
```

**Step 6: Commit**

```bash
git add backend/contacts/models.py backend/contacts/routing.py backend/contacts/migrations/
git commit -m "feat(routing): add LeadRoutingRule, RoundRobinState models and routing engine"
```

---

## Task 7: Lead Routing — Signal & API

**Files:**
- Modify: `backend/contacts/signals.py`
- Modify: `backend/contacts/serializers.py`
- Modify: `backend/contacts/views.py`
- Modify: `backend/contacts/urls.py`

**Step 1: Add routing signal**

Add to `backend/contacts/signals.py`:

```python
@receiver(post_save, sender="contacts.Contact")
def route_lead_on_create(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.owner_id is not None:
        return
    from .routing import route_lead
    route_lead(instance)
```

**Step 2: Add `owner` to ContactSerializer**

In `backend/contacts/serializers.py`, add to `ContactSerializer.Meta.fields`:
- `"owner"` field
- Add a read-only `owner_name` field:

```python
owner_name = serializers.SerializerMethodField()
```

Add method:

```python
def get_owner_name(self, obj):
    if obj.owner:
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip()
    return None
```

Add `"owner"` and `"owner_name"` to `fields`. Add `"owner_name"` to `read_only_fields`.

**Step 3: Add routing rule serializer and views**

Add to `backend/contacts/serializers.py`:

```python
from .models import LeadRoutingRule, RoundRobinState


class LeadRoutingRuleSerializer(serializers.ModelSerializer):
    assign_to_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadRoutingRule
        fields = ["id", "name", "priority", "conditions", "assign_to", "assign_to_name", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_assign_to_name(self, obj):
        if obj.assign_to:
            return f"{obj.assign_to.first_name} {obj.assign_to.last_name}".strip()
        return None


class RoundRobinStateSerializer(serializers.ModelSerializer):
    eligible_user_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )

    class Meta:
        model = RoundRobinState
        fields = ["eligible_user_ids", "last_assigned_index"]
        read_only_fields = ["last_assigned_index"]

    def update(self, instance, validated_data):
        user_ids = validated_data.pop("eligible_user_ids", None)
        if user_ids is not None:
            instance.eligible_users.set(user_ids)
        return instance
```

Add to `backend/contacts/views.py`:

```python
from .models import LeadRoutingRule, RoundRobinState
from .serializers import LeadRoutingRuleSerializer, RoundRobinStateSerializer


class LeadRoutingRuleViewSet(viewsets.ModelViewSet):
    serializer_class = LeadRoutingRuleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return LeadRoutingRule.objects.filter(
            organization=self.request.organization
        ).select_related("assign_to")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def round_robin_settings(request):
    state, _ = RoundRobinState.objects.get_or_create(
        organization=request.organization
    )
    if request.method == "GET":
        eligible_ids = list(state.eligible_users.values_list("id", flat=True))
        return Response({
            "eligible_user_ids": [str(uid) for uid in eligible_ids],
            "last_assigned_index": state.last_assigned_index,
        })
    serializer = RoundRobinStateSerializer(state, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({"status": "ok"})
```

**Step 4: Add URLs**

In `backend/contacts/urls.py`, add:

```python
routing_router = DefaultRouter()
routing_router.register("", views.LeadRoutingRuleViewSet, basename="routing-rule")
```

Add to `urlpatterns` (before catch-all):

```python
path("routing-rules/", include(routing_router.urls)),
path("round-robin/", views.round_robin_settings),
```

**Step 5: Commit**

```bash
git add backend/contacts/signals.py backend/contacts/serializers.py backend/contacts/views.py backend/contacts/urls.py
git commit -m "feat(routing): add routing signal, API endpoints for rules and round-robin"
```

---

## Task 8: Lead Routing — Frontend Settings Page

**Files:**
- Create: `frontend/services/routing.ts`
- Create: `frontend/components/settings/RoutingSettings.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx`
- Modify: `frontend/types/contacts.ts`

**Step 1: Add types**

Add to `frontend/types/contacts.ts`:

```typescript
export interface LeadRoutingRule {
  id: string
  name: string
  priority: number
  conditions: Record<string, unknown>
  assign_to: string
  assign_to_name: string | null
  is_active: boolean
  created_at: string
}
```

And add to the `Contact` interface:
- `owner: string | null`
- `owner_name: string | null`

**Step 2: Create routing service**

Create `frontend/services/routing.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { LeadRoutingRule } from "@/types/contacts"

export async function fetchRoutingRules(): Promise<LeadRoutingRule[]> {
  return apiFetch<LeadRoutingRule[]>("/contacts/routing-rules/")
}

export async function createRoutingRule(
  data: Omit<LeadRoutingRule, "id" | "created_at" | "assign_to_name">
): Promise<LeadRoutingRule> {
  return apiFetch<LeadRoutingRule>("/contacts/routing-rules/", {
    method: "POST",
    json: data,
  })
}

export async function updateRoutingRule(
  id: string,
  data: Partial<LeadRoutingRule>
): Promise<LeadRoutingRule> {
  return apiFetch<LeadRoutingRule>(`/contacts/routing-rules/${id}/`, {
    method: "PATCH",
    json: data,
  })
}

export async function deleteRoutingRule(id: string): Promise<void> {
  await apiFetch(`/contacts/routing-rules/${id}/`, { method: "DELETE" })
}

export async function fetchRoundRobinState(): Promise<{
  eligible_user_ids: string[]
  last_assigned_index: number
}> {
  return apiFetch("/contacts/round-robin/")
}

export async function updateRoundRobinState(
  eligible_user_ids: string[]
): Promise<void> {
  await apiFetch("/contacts/round-robin/", {
    method: "PATCH",
    json: { eligible_user_ids },
  })
}
```

**Step 3: Create RoutingSettings component**

Create `frontend/components/settings/RoutingSettings.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Route, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  fetchRoutingRules,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  fetchRoundRobinState,
  updateRoundRobinState,
} from "@/services/routing"
import { fetchMembers } from "@/services/organizations"
import type { LeadRoutingRule } from "@/types/contacts"
import { toast } from "sonner"

interface RoutingSettingsProps {
  orgId: string
}

interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

export default function RoutingSettings({ orgId }: RoutingSettingsProps) {
  const [rules, setRules] = useState<LeadRoutingRule[]>([])
  const [eligibleIds, setEligibleIds] = useState<string[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New rule form
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAssignTo, setNewAssignTo] = useState("")
  const [newConditionField, setNewConditionField] = useState("source")
  const [newConditionValue, setNewConditionValue] = useState("")

  useEffect(() => {
    Promise.all([
      fetchRoutingRules(),
      fetchRoundRobinState(),
      fetchMembers(orgId),
    ]).then(([rulesData, rrState, membersData]) => {
      setRules(rulesData)
      setEligibleIds(rrState.eligible_user_ids)
      setMembers(membersData.members)
    }).catch(() => {
      toast.error("Erreur lors du chargement")
    }).finally(() => setLoading(false))
  }, [orgId])

  const handleToggleEligible = async (userId: string, checked: boolean) => {
    const newIds = checked
      ? [...eligibleIds, userId]
      : eligibleIds.filter((id) => id !== userId)
    setEligibleIds(newIds)
    try {
      await updateRoundRobinState(newIds)
    } catch {
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const handleCreateRule = async () => {
    if (!newName || !newAssignTo || !newConditionValue) {
      toast.error("Remplissez tous les champs")
      return
    }
    setSaving(true)
    try {
      const rule = await createRoutingRule({
        name: newName,
        priority: rules.length,
        conditions: { [newConditionField]: newConditionValue },
        assign_to: newAssignTo,
        is_active: true,
      })
      setRules((prev) => [...prev, rule])
      setShowForm(false)
      setNewName("")
      setNewAssignTo("")
      setNewConditionValue("")
      toast.success("Règle créée")
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRoutingRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success("Règle supprimée")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleToggleRule = async (rule: LeadRoutingRule) => {
    try {
      await updateRoutingRule(rule.id, { is_active: !rule.is_active })
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      )
    } catch {
      toast.error("Erreur lors de la mise à jour")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl tracking-tight">Lead routing</h2>
            <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
              Assignation automatique des nouveaux contacts
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 font-[family-name:var(--font-body)]">
        {/* Round Robin */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Round-robin — Membres éligibles
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Les nouveaux leads sans règle spécifique seront distribués tour à tour entre ces membres.
          </p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={eligibleIds.includes(m.user_id)}
                    onCheckedChange={(checked) => handleToggleEligible(m.user_id, !!checked)}
                  />
                  <span className="text-sm">
                    {m.first_name} {m.last_name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Règles prioritaires
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </div>

          {rules.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground italic">
              Aucune règle. Le round-robin sera utilisé pour tous les leads.
            </p>
          )}

          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleRule(rule)}
                  />
                  <div>
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(rule.conditions).map(([k, v]) => `${k} = ${v}`).join(", ")}
                      {" → "}
                      {rule.assign_to_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add rule form */}
          {showForm && (
            <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nom de la règle</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Leads tech → Paul"
                  className="h-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Condition</Label>
                  <select
                    value={newConditionField}
                    onChange={(e) => setNewConditionField(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="source">Source</option>
                    <option value="industry">Industrie</option>
                    <option value="country">Pays</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Valeur</Label>
                  <Input
                    value={newConditionValue}
                    onChange={(e) => setNewConditionValue(e.target.value)}
                    placeholder="Ex: website"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Assigner à</Label>
                <select
                  value={newAssignTo}
                  onChange={(e) => setNewAssignTo(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Sélectionner un membre</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleCreateRule} disabled={saving}>
                  {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Créer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Add RoutingSettings to settings page**

In `frontend/app/(app)/settings/page.tsx`, import and add after ScoringSettings:

```tsx
import RoutingSettings from "@/components/settings/RoutingSettings"
```

```tsx
{orgId && <RoutingSettings orgId={orgId} />}
```

**Step 5: Commit**

```bash
git add frontend/types/contacts.ts frontend/services/routing.ts frontend/components/settings/RoutingSettings.tsx frontend/app/\(app\)/settings/page.tsx
git commit -m "feat(routing): add routing settings UI with rules and round-robin config"
```

---

## Task 9: Lead Routing — Display Owner on Contact

**Files:**
- Modify: `frontend/components/contacts/ContactHeader.tsx`
- Modify: `frontend/components/contacts/ContactInfo.tsx` (if owner display needed in detail)

**Step 1: Add owner display to ContactHeader**

Read `ContactHeader.tsx`, then add near the top of the contact info area:

```tsx
{contact.owner_name && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
    Propriétaire: {contact.owner_name}
  </span>
)}
```

**Step 2: Commit**

```bash
git add frontend/components/contacts/ContactHeader.tsx
git commit -m "feat(routing): display contact owner in header"
```

---

## Task 10: Recurring Tasks — Backend Logic

**Files:**
- Modify: `backend/contacts/signals.py` (or create `backend/tasks/signals.py`)
- Create: `backend/tasks/recurrence.py`
- Modify: `backend/tasks/apps.py`

**Step 1: Create recurrence parser**

Create `backend/tasks/recurrence.py`:

```python
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone


WEEKDAY_MAP = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


def compute_next_due_date(current_due_date, recurrence_rule):
    """Compute the next due date from a recurrence rule.

    Supported formats:
    - "DAILY"
    - "WEEKLY"
    - "MONTHLY"
    - "WEEKLY;BYDAY=MO,WE,FR"
    """
    if not recurrence_rule:
        return None

    rule = recurrence_rule.upper().strip()
    now = timezone.now()
    base = max(current_due_date, now) if current_due_date else now

    if rule == "DAILY":
        return base + timedelta(days=1)

    if rule == "WEEKLY":
        return base + timedelta(weeks=1)

    if rule == "MONTHLY":
        return base + relativedelta(months=1)

    if rule.startswith("WEEKLY;BYDAY="):
        days_str = rule.split("BYDAY=")[1]
        days = [WEEKDAY_MAP[d.strip()] for d in days_str.split(",") if d.strip() in WEEKDAY_MAP]
        if not days:
            return base + timedelta(weeks=1)

        # Find next matching weekday after base
        current_weekday = base.weekday()
        for offset in range(1, 8):
            candidate = base + timedelta(days=offset)
            if candidate.weekday() in days:
                return candidate

    return None
```

**Step 2: Create task signal for recurrence**

Create `backend/tasks/signals.py`:

```python
from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import Task


@receiver(pre_save, sender=Task)
def create_next_recurring_task(sender, instance, **kwargs):
    """When a recurring task is marked done, create the next occurrence."""
    if not instance.pk:
        return
    if not instance.is_recurring or not instance.recurrence_rule:
        return
    if not instance.is_done:
        return

    # Check if it was previously not done
    try:
        old = Task.objects.get(pk=instance.pk)
    except Task.DoesNotExist:
        return

    if old.is_done:
        return  # Already was done, no need to create again

    from .recurrence import compute_next_due_date
    next_due = compute_next_due_date(instance.due_date, instance.recurrence_rule)
    if not next_due:
        return

    # Create next occurrence (after current save completes, use post_save instead)
    # We'll store the info and handle in post_save
    instance._create_next_occurrence = {
        "due_date": next_due,
    }


from django.db.models.signals import post_save


@receiver(post_save, sender=Task)
def handle_recurring_task_created(sender, instance, **kwargs):
    """After saving a done recurring task, create the next occurrence."""
    info = getattr(instance, "_create_next_occurrence", None)
    if not info:
        return

    # Clear the flag to prevent re-trigger
    del instance._create_next_occurrence

    new_task = Task.objects.create(
        organization=instance.organization,
        created_by=instance.created_by,
        description=instance.description,
        due_date=info["due_date"],
        contact=instance.contact,
        deal=instance.deal,
        priority=instance.priority,
        is_recurring=True,
        recurrence_rule=instance.recurrence_rule,
    )

    # Copy assignees
    from .models import TaskAssignment
    for assignment in instance.assignments.all():
        TaskAssignment.objects.create(
            task=new_task,
            user=assignment.user,
            assigned_by=assignment.assigned_by,
        )
```

**Step 3: Register signals in apps.py**

Modify `backend/tasks/apps.py`:

```python
from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tasks"

    def ready(self):
        import tasks.signals  # noqa: F401
```

**Step 4: Add `python-dateutil` if not already in requirements**

```bash
cd backend && pip install python-dateutil && pip freeze | grep dateutil >> requirements.txt
```

(Check if it's already there first — `grep dateutil requirements.txt`)

**Step 5: Commit**

```bash
git add backend/tasks/recurrence.py backend/tasks/signals.py backend/tasks/apps.py
git commit -m "feat(recurring): add recurrence engine and signal to create next task on completion"
```

---

## Task 11: Recurring Tasks — Frontend UI

**Files:**
- Modify: `frontend/types/tasks.ts`
- Modify: `frontend/components/tasks/TaskDialog.tsx`

**Step 1: Add recurrence fields to Task type**

In `frontend/types/tasks.ts`, add to `Task` interface:

```typescript
is_recurring: boolean
recurrence_rule: string
```

**Step 2: Add recurrence UI to TaskDialog**

In `frontend/components/tasks/TaskDialog.tsx`:

Add state variables after `assigneeIds`:

```typescript
const [isRecurring, setIsRecurring] = useState(false)
const [recurrenceRule, setRecurrenceRule] = useState("")
const [customDays, setCustomDays] = useState<string[]>([])
```

In the `useEffect` that handles `open` changes, add loading of existing task recurrence:

```typescript
// Inside if (task) block:
setIsRecurring(task.is_recurring || false)
setRecurrenceRule(task.recurrence_rule || "")
if (task.recurrence_rule?.startsWith("WEEKLY;BYDAY=")) {
  setCustomDays(task.recurrence_rule.split("BYDAY=")[1].split(","))
} else {
  setCustomDays([])
}

// Inside else block (new task):
setIsRecurring(false)
setRecurrenceRule("")
setCustomDays([])
```

Add recurrence fields to the payload in `handleSave`:

```typescript
is_recurring: isRecurring,
recurrence_rule: isRecurring ? recurrenceRule : "",
```

Add this JSX block after the priority section (after line ~206, before the contact autocomplete):

```tsx
{/* Récurrence */}
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Checkbox
      id="task-recurring"
      checked={isRecurring}
      onCheckedChange={(checked) => {
        setIsRecurring(!!checked)
        if (!checked) {
          setRecurrenceRule("")
          setCustomDays([])
        } else {
          setRecurrenceRule("WEEKLY")
        }
      }}
    />
    <Label htmlFor="task-recurring" className="text-sm cursor-pointer">
      Tâche récurrente
    </Label>
  </div>
  {isRecurring && (
    <div className="space-y-2 pl-6">
      <select
        value={recurrenceRule.startsWith("WEEKLY;BYDAY=") ? "CUSTOM" : recurrenceRule}
        onChange={(e) => {
          const val = e.target.value
          if (val === "CUSTOM") {
            setRecurrenceRule("WEEKLY;BYDAY=MO")
            setCustomDays(["MO"])
          } else {
            setRecurrenceRule(val)
            setCustomDays([])
          }
        }}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="DAILY">Quotidien</option>
        <option value="WEEKLY">Hebdomadaire</option>
        <option value="MONTHLY">Mensuel</option>
        <option value="CUSTOM">Jours personnalisés</option>
      </select>
      {(recurrenceRule.startsWith("WEEKLY;BYDAY=") || recurrenceRule === "CUSTOM") && (
        <div className="flex gap-1.5">
          {[
            { key: "MO", label: "Lu" },
            { key: "TU", label: "Ma" },
            { key: "WE", label: "Me" },
            { key: "TH", label: "Je" },
            { key: "FR", label: "Ve" },
            { key: "SA", label: "Sa" },
            { key: "SU", label: "Di" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                const newDays = customDays.includes(key)
                  ? customDays.filter((d) => d !== key)
                  : [...customDays, key]
                if (newDays.length > 0) {
                  setCustomDays(newDays)
                  setRecurrenceRule(`WEEKLY;BYDAY=${newDays.join(",")}`)
                }
              }}
              className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                customDays.includes(key)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

Also add the `Checkbox` import from `@/components/ui/checkbox` at the top.

**Step 3: Add recurring badge to task list**

In the task list component (find the file that renders task rows), add a small recurring icon next to recurring tasks. Look for where `task.description` is rendered and add:

```tsx
{task.is_recurring && (
  <span className="text-muted-foreground ml-1" title="Tâche récurrente">↻</span>
)}
```

**Step 4: Commit**

```bash
git add frontend/types/tasks.ts frontend/components/tasks/TaskDialog.tsx
git commit -m "feat(recurring): add recurrence selector UI to TaskDialog"
```

---

## Task 12: Create Default Scoring Rules on Organization Creation

**Files:**
- Modify: `backend/organizations/views.py` or wherever organizations are created

**Step 1: Find where organizations are created**

Search for `Organization.objects.create` or serializer that creates organizations.

**Step 2: Add default scoring rules creation**

After an organization and its `OrganizationSettings` are created, call:

```python
from contacts.scoring import create_default_scoring_rules
create_default_scoring_rules(organization)
```

**Step 3: Commit**

```bash
git add backend/organizations/
git commit -m "feat(scoring): create default scoring rules on organization setup"
```

---

## Task 13: Update OrgSettings Serializer for Scoring Thresholds

**Files:**
- Modify: `backend/organizations/serializers.py` (or wherever OrgSettings are serialized)

**Step 1: Add scoring fields to OrgSettings serializer**

Add `scoring_hot_threshold` and `scoring_warm_threshold` to the serializer fields.

**Step 2: Update frontend OrgSettings type**

In `frontend/services/organizations.ts`, update the `OrgSettings` interface:

```typescript
export interface OrgSettings {
  task_reminder_offsets: number[]
  scoring_hot_threshold?: number
  scoring_warm_threshold?: number
}
```

**Step 3: Commit**

```bash
git add backend/organizations/ frontend/services/organizations.ts
git commit -m "feat(scoring): expose scoring thresholds in org settings API"
```

---

## Task 14: Final Integration Test & Verification

**Step 1: Run backend migrations check**

```bash
cd backend && python manage.py makemigrations --check
```

Expected: No new migrations needed.

**Step 2: Run Django checks**

```bash
cd backend && python manage.py check
```

Expected: No errors.

**Step 3: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any TypeScript errors.

**Step 4: Manual smoke test checklist**

- [ ] Create a contact → score should be 0, lead_score should be "cold"
- [ ] Add a timeline entry (call, note) → score should increase
- [ ] Check scoring settings page loads and rules are editable
- [ ] Check routing settings page loads
- [ ] Add members to round-robin → create contact → owner should be assigned
- [ ] Create a routing rule → create matching contact → owner should match rule
- [ ] Create a recurring task (weekly) → mark done → new task should appear with +7d due date
- [ ] Create a recurring task (custom days) → mark done → next occurrence on correct day

**Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve integration issues from lead scoring, routing, and recurring tasks"
```
