# Contact Enrichment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the Contact model with 17 new fields (profile, qualification, preferences, AI summary), add an `update_contact` chat tool, auto-generate AI summaries on contact events, and redesign the frontend detail page.

**Architecture:** Direct fields on the Django Contact model (no JSONField except `interests`). AI summary regenerated asynchronously after timeline events. New `update_contact` tool registered on the chat agent. Frontend contact detail page reorganized into sections.

**Tech Stack:** Django, DRF, Pydantic AI, Next.js, Tailwind, shadcn/ui

---

### Task 1: Add new fields to Contact model

**Files:**
- Modify: `backend/contacts/models.py:1-31`
- Create: `backend/contacts/migrations/0003_contact_enrichment.py` (auto-generated)

**Step 1: Add the new fields to the Contact model**

Replace the full content of `backend/contacts/models.py`:

```python
import uuid
from django.db import models
from django.conf import settings


class Contact(models.Model):
    class LeadScore(models.TextChoices):
        HOT = "hot", "Chaud"
        WARM = "warm", "Tiede"
        COLD = "cold", "Froid"

    class DecisionRole(models.TextChoices):
        DECISION_MAKER = "decision_maker", "Decideur"
        INFLUENCER = "influencer", "Influenceur"
        USER = "user", "Utilisateur"
        OTHER = "other", "Autre"

    class PreferredChannel(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Telephone"
        LINKEDIN = "linkedin", "LinkedIn"
        OTHER = "other", "Autre"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    # Basic info (existing)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    company = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(max_length=100, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")

    # Profile
    job_title = models.CharField(max_length=150, blank=True, default="")
    linkedin_url = models.URLField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    industry = models.CharField(max_length=150, blank=True, default="")

    # Qualification
    lead_score = models.CharField(
        max_length=10, choices=LeadScore.choices, blank=True, default=""
    )
    estimated_budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    identified_needs = models.TextField(blank=True, default="")
    decision_role = models.CharField(
        max_length=20, choices=DecisionRole.choices, blank=True, default=""
    )

    # Preferences
    preferred_channel = models.CharField(
        max_length=10, choices=PreferredChannel.choices, blank=True, default=""
    )
    timezone = models.CharField(max_length=50, blank=True, default="")
    language = models.CharField(max_length=10, blank=True, default="")
    interests = models.JSONField(default=list, blank=True)
    birthday = models.DateField(null=True, blank=True)

    # AI Summary
    ai_summary = models.TextField(blank=True, default="")
    ai_summary_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
```

**Step 2: Generate and apply migration**

Run: `cd backend && python manage.py makemigrations contacts`
Expected: Migration file created for 17 new fields.

Run: `cd backend && python manage.py migrate`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add backend/contacts/models.py backend/contacts/migrations/
git commit -m "feat(contacts): add enrichment fields to Contact model"
```

---

### Task 2: Update ContactSerializer with new fields

**Files:**
- Modify: `backend/contacts/serializers.py:1-22`

**Step 1: Update the serializer to include all new fields**

Replace the full content of `backend/contacts/serializers.py`:

```python
from rest_framework import serializers
from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "company",
            "source",
            "tags",
            "notes",
            # Profile
            "job_title",
            "linkedin_url",
            "website",
            "address",
            "industry",
            # Qualification
            "lead_score",
            "estimated_budget",
            "identified_needs",
            "decision_role",
            # Preferences
            "preferred_channel",
            "timezone",
            "language",
            "interests",
            "birthday",
            # AI Summary
            "ai_summary",
            "ai_summary_updated_at",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "ai_summary_updated_at", "created_at", "updated_at"]
```

**Step 2: Run existing tests to verify no breakage**

Run: `cd backend && python manage.py test contacts`
Expected: All existing tests pass (new fields are all optional).

**Step 3: Commit**

```bash
git add backend/contacts/serializers.py
git commit -m "feat(contacts): expose enrichment fields in serializer"
```

---

### Task 3: Add tests for new contact fields

**Files:**
- Modify: `backend/contacts/tests.py`

**Step 1: Add test for creating contact with enrichment fields**

Add to the end of `ContactTests` class in `backend/contacts/tests.py`:

```python
    def test_create_contact_with_enrichment_fields(self):
        response = self.client.post(
            "/api/contacts/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "company": "Decathlon",
                "job_title": "Directrice commerciale",
                "linkedin_url": "https://linkedin.com/in/mariedupont",
                "industry": "Retail",
                "lead_score": "hot",
                "estimated_budget": "50000.00",
                "decision_role": "decision_maker",
                "preferred_channel": "email",
                "language": "fr",
                "interests": ["sport", "retail"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["job_title"], "Directrice commerciale")
        self.assertEqual(response.data["lead_score"], "hot")
        self.assertEqual(response.data["decision_role"], "decision_maker")
        self.assertEqual(response.data["interests"], ["sport", "retail"])

    def test_update_contact_enrichment_fields(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.patch(
            f"/api/contacts/{create.data['id']}/",
            {
                "job_title": "CEO",
                "lead_score": "hot",
                "estimated_budget": "100000.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["job_title"], "CEO")
        self.assertEqual(response.data["lead_score"], "hot")
        self.assertEqual(response.data["estimated_budget"], "100000.00")

    def test_ai_summary_updated_at_is_read_only(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.patch(
            f"/api/contacts/{create.data['id']}/",
            {"ai_summary_updated_at": "2025-01-01T00:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["ai_summary_updated_at"])
```

**Step 2: Run tests**

Run: `cd backend && python manage.py test contacts`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add backend/contacts/tests.py
git commit -m "test(contacts): add tests for enrichment fields"
```

---

### Task 4: Add `update_contact` chat tool

**Files:**
- Modify: `backend/chat/tools.py:31-88` (contacts section)

**Step 1: Add the update_contact tool**

Insert after the `search_contacts` function (after line 88) in `backend/chat/tools.py`:

```python
def update_contact(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    job_title: Optional[str] = None,
    linkedin_url: Optional[str] = None,
    website: Optional[str] = None,
    address: Optional[str] = None,
    industry: Optional[str] = None,
    lead_score: Optional[str] = None,
    estimated_budget: Optional[float] = None,
    identified_needs: Optional[str] = None,
    decision_role: Optional[str] = None,
    preferred_channel: Optional[str] = None,
    timezone: Optional[str] = None,
    language: Optional[str] = None,
    interests: Optional[list[str]] = None,
    birthday: Optional[str] = None,
    notes: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """Update an existing contact's fields. Only provided fields are updated."""
    org_id = ctx.deps.organization_id
    try:
        contact = Contact.objects.get(id=contact_id, organization_id=org_id)
    except Contact.DoesNotExist:
        return {"action": "error", "message": f"Contact {contact_id} not found."}

    updatable = {
        "first_name": first_name, "last_name": last_name, "email": email,
        "phone": phone, "company": company, "job_title": job_title,
        "linkedin_url": linkedin_url, "website": website, "address": address,
        "industry": industry, "lead_score": lead_score,
        "identified_needs": identified_needs, "decision_role": decision_role,
        "preferred_channel": preferred_channel, "timezone": timezone,
        "language": language, "interests": interests, "notes": notes,
        "source": source,
    }
    if estimated_budget is not None:
        from decimal import Decimal
        updatable["estimated_budget"] = Decimal(str(estimated_budget))
    if birthday is not None:
        from datetime import date
        try:
            updatable["birthday"] = date.fromisoformat(birthday)
        except ValueError:
            return {"action": "error", "message": f"Invalid birthday format: {birthday}. Use YYYY-MM-DD."}

    changed = []
    for field, value in updatable.items():
        if value is not None:
            setattr(contact, field, value)
            changed.append(field)

    if not changed:
        return {"action": "error", "message": "No fields provided to update."}

    contact.save()

    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
        content=f"Contact updated via chat: {', '.join(changed)}",
        metadata={"changed_fields": changed},
    )

    return {
        "action": "contact_updated",
        "id": str(contact.id),
        "name": f"{contact.first_name} {contact.last_name}",
        "changed_fields": changed,
    }
```

**Step 2: Register the tool in ALL_TOOLS**

In `backend/chat/tools.py`, update the `ALL_TOOLS` list to include `update_contact`:

```python
ALL_TOOLS = [
    create_contact,
    search_contacts,
    update_contact,
    create_deal,
    move_deal,
    create_task,
    complete_task,
    add_note,
    get_dashboard_summary,
    search_all,
]
```

**Step 3: Update search_contacts to return enrichment data**

Update the `search_contacts` results dict in `backend/chat/tools.py` to include more useful fields:

```python
    results = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}",
            "company": c.company,
            "email": c.email,
            "job_title": c.job_title,
            "lead_score": c.lead_score,
        }
        for c in contacts
    ]
```

**Step 4: Run tests**

Run: `cd backend && python manage.py test chat`
Expected: All existing tests pass.

**Step 5: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add update_contact tool with all enrichment fields"
```

---

### Task 5: Add test for update_contact tool

**Files:**
- Modify: `backend/chat/tests.py`

**Step 1: Add a direct test for the update_contact tool function**

Add a new test class at the end of `backend/chat/tests.py`:

```python
class UpdateContactToolTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "tooltest@example.com",
                "password": "securepass123",
                "first_name": "Tool",
                "last_name": "Test",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        # Create a contact to update
        resp = self.client.post(
            "/api/contacts/",
            {"first_name": "Marie", "last_name": "Dupont"},
        )
        self.contact_id = resp.data["id"]

        from accounts.models import User
        from organizations.models import Membership
        self.user = User.objects.get(email="tooltest@example.com")
        self.org = Membership.objects.filter(user=self.user).first().organization

    def test_update_contact_tool(self):
        from chat.tools import update_contact, ChatDeps
        from unittest.mock import MagicMock

        ctx = MagicMock()
        ctx.deps = ChatDeps(
            organization_id=str(self.org.id),
            user_id=str(self.user.id),
        )
        result = update_contact(
            ctx,
            contact_id=str(self.contact_id),
            job_title="CEO",
            lead_score="hot",
            industry="Tech",
        )
        self.assertEqual(result["action"], "contact_updated")
        self.assertIn("job_title", result["changed_fields"])
        self.assertIn("lead_score", result["changed_fields"])

        # Verify persisted
        from contacts.models import Contact
        contact = Contact.objects.get(id=self.contact_id)
        self.assertEqual(contact.job_title, "CEO")
        self.assertEqual(contact.lead_score, "hot")

    def test_update_contact_tool_not_found(self):
        from chat.tools import update_contact, ChatDeps
        from unittest.mock import MagicMock

        ctx = MagicMock()
        ctx.deps = ChatDeps(
            organization_id=str(self.org.id),
            user_id=str(self.user.id),
        )
        result = update_contact(
            ctx,
            contact_id="00000000-0000-0000-0000-000000000000",
            job_title="CEO",
        )
        self.assertEqual(result["action"], "error")
```

**Step 2: Run tests**

Run: `cd backend && python manage.py test chat`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add backend/chat/tests.py
git commit -m "test(chat): add tests for update_contact tool"
```

---

### Task 6: Add AI summary generation

**Files:**
- Create: `backend/contacts/ai_summary.py`
- Modify: `backend/contacts/views.py:24-32` (perform_update)
- Modify: `backend/chat/tools.py` (update_contact and add_note)

**Step 1: Create the AI summary generation module**

Create `backend/contacts/ai_summary.py`:

```python
import logging
import threading

from django.conf import settings
from django.utils import timezone
from pydantic_ai import Agent

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """Tu es un assistant CRM. Genere un resume concis (3-5 phrases) de ce contact en francais.
Synthetise les informations cles : qui est cette personne, son role, ses besoins, l'historique des interactions et les deals en cours.
Reponds UNIQUEMENT avec le resume, sans titre ni formatage.

Informations du contact:
{contact_info}

Historique des interactions:
{timeline_info}

Deals associes:
{deals_info}"""


def _build_contact_info(contact) -> str:
    lines = [f"Nom: {contact.first_name} {contact.last_name}"]
    if contact.company:
        lines.append(f"Entreprise: {contact.company}")
    if contact.job_title:
        lines.append(f"Poste: {contact.job_title}")
    if contact.industry:
        lines.append(f"Secteur: {contact.industry}")
    if contact.lead_score:
        lines.append(f"Score lead: {contact.get_lead_score_display()}")
    if contact.decision_role:
        lines.append(f"Role: {contact.get_decision_role_display()}")
    if contact.identified_needs:
        lines.append(f"Besoins: {contact.identified_needs}")
    if contact.notes:
        lines.append(f"Notes: {contact.notes}")
    return "\n".join(lines)


def _build_timeline_info(contact) -> str:
    entries = contact.timeline_entries.order_by("-created_at")[:20]
    if not entries:
        return "Aucune interaction"
    lines = []
    for e in entries:
        lines.append(f"- [{e.created_at.strftime('%d/%m/%Y')}] {e.entry_type}: {e.content[:150]}")
    return "\n".join(lines)


def _build_deals_info(contact) -> str:
    deals = contact.deals.select_related("stage").all()
    if not deals:
        return "Aucun deal"
    lines = []
    for d in deals:
        lines.append(f"- {d.name}: {d.amount} EUR ({d.stage.name})")
    return "\n".join(lines)


def generate_ai_summary(contact_id: str) -> None:
    """Generate and save an AI summary for a contact. Runs synchronously."""
    from contacts.models import Contact

    try:
        contact = Contact.objects.get(id=contact_id)
    except Contact.DoesNotExist:
        logger.warning("Contact %s not found for summary generation", contact_id)
        return

    contact_info = _build_contact_info(contact)
    timeline_info = _build_timeline_info(contact)
    deals_info = _build_deals_info(contact)

    prompt = SUMMARY_PROMPT.format(
        contact_info=contact_info,
        timeline_info=timeline_info,
        deals_info=deals_info,
    )

    try:
        agent = Agent(model=settings.AI_MODEL)
        result = agent.run_sync(prompt)
        contact.ai_summary = result.output.strip()
        contact.ai_summary_updated_at = timezone.now()
        contact.save(update_fields=["ai_summary", "ai_summary_updated_at"])
    except Exception:
        logger.exception("AI summary generation failed for contact %s", contact_id)


def trigger_summary_generation(contact_id: str) -> None:
    """Trigger AI summary generation in a background thread."""
    thread = threading.Thread(
        target=generate_ai_summary,
        args=(str(contact_id),),
        daemon=True,
    )
    thread.start()
```

**Step 2: Trigger summary after contact update in views**

Update `perform_update` in `backend/contacts/views.py:24-32`:

```python
    def perform_update(self, serializer):
        instance = serializer.save()
        TimelineEntry.objects.create(
            organization=self.request.organization,
            created_by=self.request.user,
            contact=instance,
            entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
            content="Contact modifie",
        )
        from .ai_summary import trigger_summary_generation
        trigger_summary_generation(str(instance.id))
```

**Step 3: Trigger summary in update_contact tool**

Add at the end of the `update_contact` function in `backend/chat/tools.py`, before the return:

```python
    from contacts.ai_summary import trigger_summary_generation
    trigger_summary_generation(str(contact.id))
```

**Step 4: Trigger summary in add_note tool when a contact is involved**

Add at the end of the `add_note` function in `backend/chat/tools.py`, before the return:

```python
    if contact_id:
        from contacts.ai_summary import trigger_summary_generation
        trigger_summary_generation(contact_id)
```

**Step 5: Run tests**

Run: `cd backend && python manage.py test contacts chat`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/contacts/ai_summary.py backend/contacts/views.py backend/chat/tools.py
git commit -m "feat(contacts): add automatic AI summary generation"
```

---

### Task 7: Update system prompt with enrichment context

**Files:**
- Modify: `backend/chat/prompts.py:1-32`
- Modify: `backend/chat/views.py:43-65` (_build_context)

**Step 1: Update the system prompt to mention update_contact**

In `backend/chat/prompts.py`, update the capabilities section to mention the new tool and fields:

```python
SYSTEM_PROMPT = """Tu es l'assistant CRM intelligent de {user_name}. Tu aides a gerer les contacts, deals, taches et notes.

## Tes capacites
Tu peux :
- Creer, modifier et rechercher des contacts (avec infos enrichies : poste, LinkedIn, secteur, qualification, preferences)
- Mettre a jour les champs d'un contact existant (utilise update_contact avec le contact_id)
- Creer et gerer des deals dans le pipeline
- Programmer des rappels et taches
- Ajouter des notes a des contacts ou deals
- Donner un resume de l'activite (dashboard)
- Rechercher dans toutes les donnees

## Comportement
- Extrais automatiquement les entites (noms, entreprises, montants, dates) du message de l'utilisateur
- Si une information est ambigue, pose UNE question de clarification
- Avant de creer un contact, verifie s'il existe deja (utilise search_contacts)
- Quand l'utilisateur mentionne des infos sur un contact (poste, besoins, score...), utilise update_contact pour les enregistrer
- Confirme chaque action effectuee de maniere claire et structuree
- Reponds dans la langue de l'utilisateur (francais ou anglais)
- Sois concis et professionnel

## Contexte actuel
- Date et heure actuelles : {current_datetime}
- Contacts recents : {contacts_summary}
- Deals actifs : {deals_summary}
- Taches a venir : {tasks_summary}

## Format de reponse
Quand tu effectues des actions, structure ta reponse ainsi :
- Texte de confirmation pour chaque action
- Si tu as des suggestions (ex: creer un rappel associe), propose-les

Tu peux utiliser du markdown (gras, listes, titres) pour structurer tes reponses. Reste concis et professionnel.
"""
```

**Step 2: Enrich the contacts summary in _build_context**

In `backend/chat/views.py`, update the `_build_context` function to include more info:

```python
def _build_context(org):
    """Build a summary of recent data for the system prompt."""
    contacts = Contact.objects.filter(organization=org).order_by("-created_at")[:5]
    contact_parts = []
    for c in contacts:
        parts = [f"{c.first_name} {c.last_name}"]
        if c.company:
            parts.append(f"({c.company})")
        if c.lead_score:
            parts.append(f"[{c.get_lead_score_display()}]")
        contact_parts.append(" ".join(parts))
    contacts_summary = ", ".join(contact_parts) or "Aucun contact"

    deals = Deal.objects.filter(organization=org).exclude(
        stage__name__in=["Gagne", "Perdu"],
    ).order_by("-created_at")[:5]
    deals_summary = ", ".join(
        f"{d.name} ({d.amount} EUR - {d.stage.name})" for d in deals
    ) or "Aucun deal actif"

    tasks = Task.objects.filter(
        organization=org, is_done=False,
    ).order_by("due_date")[:5]
    tasks_summary = ", ".join(
        f"{t.description} (echeance: {t.due_date.strftime('%d/%m/%Y')})"
        for t in tasks
    ) or "Aucune tache"

    return contacts_summary, deals_summary, tasks_summary
```

**Step 3: Run tests**

Run: `cd backend && python manage.py test chat`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add backend/chat/prompts.py backend/chat/views.py
git commit -m "feat(chat): update system prompt and context for enriched contacts"
```

---

### Task 8: Redesign frontend Contact detail page

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Update the Contact interface and form state**

Update the `Contact` interface (line 35-47) and `formData` state to include all new fields. Update the entire page component to display the new sections: header with lead score badge, coordonnees, profil pro, qualification, preferences, AI summary, and timeline.

Key changes:
- Add all 17 new fields to the `Contact` interface
- Add new fields to `formData` state
- Add new Lucide icons: `Linkedin`, `MapPin`, `Briefcase`, `Target`, `Heart`, `Brain`, `Clock`, `Languages`, `Cake`, `Sparkles`
- Reorganize the display into sections with headers
- AI summary gets its own distinct card with timestamp
- Lead score displayed as colored badge in header (hot=red, warm=orange, cold=blue)
- Edit mode includes all new fields organized in the same sections

Use the `frontend-design` skill for implementing this page with high design quality.

**Step 2: Run dev server to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(frontend): redesign contact detail page with enrichment fields"
```

---

### Task 9: Update frontend contact creation form

**Files:**
- Modify: `frontend/app/(app)/contacts/page.tsx`

**Step 1: Update the create contact dialog**

The create dialog currently only has: first_name, last_name, email, phone, company. Add the most important new fields to the creation form:
- `job_title` (Poste)
- `source` (already exists)
- `lead_score` (as a select: Chaud/Tiede/Froid)

Keep the creation form simple — users can add the rest via the detail page.

**Step 2: Update the Contact interface in the list page to include new fields**

Add the new fields to the Contact interface so the table can display them if needed.

**Step 3: Run build**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/contacts/page.tsx
git commit -m "feat(frontend): add job_title and lead_score to contact creation form"
```

---

### Task 10: Update ContactTable to show enrichment data

**Files:**
- Modify: `frontend/components/contacts/ContactTable.tsx`

**Step 1: Add lead score and job title columns**

Update `ContactTable` to show:
- Lead score as a colored dot/badge next to the name
- Job title under the name (small muted text)
- Keep existing columns (Entreprise, Email, Telephone, Date)

**Step 2: Run build**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/components/contacts/ContactTable.tsx
git commit -m "feat(frontend): show lead score and job title in contact table"
```

---

### Task 11: Final integration test

**Step 1: Run all backend tests**

Run: `cd backend && python manage.py test`
Expected: All tests pass.

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address integration issues from contact enrichment"
```
