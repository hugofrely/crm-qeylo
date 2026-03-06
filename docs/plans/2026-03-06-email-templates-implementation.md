# Email Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reusable email templates with TipTap editor, variable substitution, and integration across ComposeEmailDialog, Workflows, and Chat AI.

**Architecture:** New `EmailTemplate` Django model in the existing `emails` app. DRF ViewSet for CRUD + render endpoint. Frontend: new settings sub-page with TipTap editor extended with variable insertion nodes, template picker in ComposeEmailDialog, template selector in workflow ActionConfig, and new chat AI tools.

**Tech Stack:** Django 5 + DRF, Next.js 16 + React 19 + TipTap, existing `workflows/template_vars.py` for variable resolution.

---

## Task 1: Backend Model & Migration

**Files:**
- Modify: `backend/emails/models.py`
- Modify: `backend/emails/admin.py`
- Create: migration (auto-generated)

**Step 1: Add EmailTemplate model to models.py**

Add at the end of `backend/emails/models.py`:

```python
class EmailTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="email_templates",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_templates",
    )
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=500)
    body_html = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    is_shared = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name
```

**Step 2: Add FK to SentEmail for traceability**

Add to `SentEmail` model (after the `contact` field):

```python
    template = models.ForeignKey(
        "EmailTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_emails",
    )
```

**Step 3: Register in admin**

In `backend/emails/admin.py`, add:

```python
from .models import EmailAccount, SentEmail, EmailTemplate

admin.site.register(EmailTemplate)
```

**Step 4: Generate and apply migration**

Run:
```bash
cd /Users/hugofrely/dev/crm-qeylo/backend
python manage.py makemigrations emails
python manage.py migrate
```

**Step 5: Commit**

```bash
git add backend/emails/models.py backend/emails/admin.py backend/emails/migrations/
git commit -m "feat(emails): add EmailTemplate model and SentEmail.template FK"
```

---

## Task 2: Template Rendering Service

**Files:**
- Create: `backend/emails/template_rendering.py`
- Create: `backend/emails/tests/test_template_rendering.py`

**Step 1: Write the failing tests**

Create `backend/emails/tests/test_template_rendering.py`:

```python
from django.test import TestCase
from emails.template_rendering import render_email_template


class RenderEmailTemplateTests(TestCase):
    def test_replaces_contact_variables(self):
        context = {
            "contact": {
                "first_name": "Jean",
                "last_name": "Dupont",
                "email": "jean@example.com",
                "company": "Acme",
                "phone": "0612345678",
            }
        }
        subject = "Bonjour {{contact.first_name}}"
        body = "<p>Cher {{contact.first_name}} {{contact.last_name}} de {{contact.company}}</p>"

        rendered_subject, rendered_body = render_email_template(subject, body, context)

        self.assertEqual(rendered_subject, "Bonjour Jean")
        self.assertEqual(rendered_body, "<p>Cher Jean Dupont de Acme</p>")

    def test_replaces_deal_variables(self):
        context = {
            "contact": {"first_name": "Jean", "last_name": "Dupont", "email": "", "company": "", "phone": ""},
            "deal": {"name": "Projet Web", "amount": "5000", "stage": "Negotiation"},
        }
        body = "<p>Deal: {{deal.name}} — {{deal.amount}}€</p>"

        _, rendered_body = render_email_template("", body, context)

        self.assertEqual(rendered_body, "<p>Deal: Projet Web — 5000€</p>")

    def test_missing_variable_replaced_by_empty_string(self):
        context = {"contact": {"first_name": "Jean", "last_name": "", "email": "", "company": "", "phone": ""}}
        body = "<p>{{contact.first_name}} — {{deal.name}}</p>"

        _, rendered_body = render_email_template("", body, context)

        self.assertEqual(rendered_body, "<p>Jean — </p>")

    def test_no_variables_returns_unchanged(self):
        body = "<p>Simple text</p>"
        _, rendered_body = render_email_template("Subject", body, {})
        self.assertEqual(rendered_body, "<p>Simple text</p>")
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test emails.tests.test_template_rendering -v2`
Expected: FAIL — `ImportError: cannot import name 'render_email_template'`

**Step 3: Implement render_email_template**

Create `backend/emails/template_rendering.py`:

```python
"""
Render email templates by substituting {{entity.field}} variables.

Reuses the same regex pattern as workflows/template_vars.py.
"""
import re

VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\.(\w+)\}\}")


def render_email_template(
    subject: str, body_html: str, context: dict
) -> tuple[str, str]:
    """Replace {{entity.field}} placeholders with values from context.

    context example:
        {"contact": {"first_name": "Jean", ...}, "deal": {"name": "X", ...}}

    Unresolved variables are replaced with an empty string.
    Returns (rendered_subject, rendered_body_html).
    """

    def replacer(match: re.Match) -> str:
        entity = match.group(1)
        field = match.group(2)
        value = context.get(entity, {}).get(field)
        if value is None:
            return ""
        return str(value) if value else ""

    rendered_subject = VARIABLE_PATTERN.sub(replacer, subject)
    rendered_body = VARIABLE_PATTERN.sub(replacer, body_html)
    return rendered_subject, rendered_body


def build_template_context(contact=None, deal=None) -> dict:
    """Build a context dict from Django model instances."""
    context = {}
    if contact:
        context["contact"] = {
            "first_name": contact.first_name or "",
            "last_name": contact.last_name or "",
            "email": contact.email or "",
            "company": contact.company or "",
            "phone": contact.phone or "",
        }
    if deal:
        context["deal"] = {
            "name": deal.name or "",
            "amount": str(deal.amount) if deal.amount else "",
            "stage": deal.stage.name if deal.stage else "",
        }
    return context
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test emails.tests.test_template_rendering -v2`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add backend/emails/template_rendering.py backend/emails/tests/test_template_rendering.py
git commit -m "feat(emails): add template variable rendering service with tests"
```

---

## Task 3: Backend API — Serializers & ViewSet

**Files:**
- Modify: `backend/emails/serializers.py`
- Modify: `backend/emails/views.py`
- Modify: `backend/emails/urls.py`

**Step 1: Add serializers**

Add to `backend/emails/serializers.py`:

```python
from .models import EmailAccount, EmailTemplate


class EmailTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = [
            "id", "name", "subject", "body_html", "tags",
            "is_shared", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()


class EmailTemplateRenderSerializer(serializers.Serializer):
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    deal_id = serializers.UUIDField(required=False, allow_null=True)
```

**Step 2: Add template views**

Add to `backend/emails/views.py` (after existing imports):

```python
from django.db.models import Q
from .models import EmailAccount, EmailTemplate
from .serializers import EmailAccountSerializer, SendEmailSerializer, EmailTemplateSerializer, EmailTemplateRenderSerializer
from .template_rendering import render_email_template, build_template_context
```

Then add these view functions at the end of the file:

```python
# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def template_list_create(request):
    """List templates (mine + shared) or create a new one."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        qs = EmailTemplate.objects.filter(
            Q(created_by=request.user, organization=org)
            | Q(is_shared=True, organization=org)
        )
        # Filters
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search)
        tag = request.query_params.get("tag", "").strip()
        if tag:
            qs = qs.filter(tags__contains=[tag])
        if request.query_params.get("mine_only") == "true":
            qs = qs.filter(created_by=request.user)
        if request.query_params.get("shared_only") == "true":
            qs = qs.filter(is_shared=True)

        return Response(EmailTemplateSerializer(qs.distinct(), many=True).data)

    # POST
    serializer = EmailTemplateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(organization=org, created_by=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def template_detail(request, template_id):
    """Retrieve, update, or delete a template."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        template = EmailTemplate.objects.get(
            Q(created_by=request.user, organization=org)
            | Q(is_shared=True, organization=org),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(EmailTemplateSerializer(template).data)

    # PUT and DELETE require ownership
    if template.created_by != request.user:
        return Response(
            {"detail": "Seul le createur peut modifier ce template."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "DELETE":
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT
    serializer = EmailTemplateSerializer(template, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def template_render(request, template_id):
    """Render a template with resolved variables for preview."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        template = EmailTemplate.objects.get(
            Q(created_by=request.user, organization=org)
            | Q(is_shared=True, organization=org),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = EmailTemplateRenderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    contact = None
    deal = None
    contact_id = serializer.validated_data.get("contact_id")
    deal_id = serializer.validated_data.get("deal_id")

    if contact_id:
        from contacts.models import Contact
        contact = Contact.objects.filter(id=contact_id, organization=org).first()
    if deal_id:
        from deals.models import Deal
        deal = Deal.objects.select_related("stage").filter(id=deal_id, organization=org).first()

    context = build_template_context(contact=contact, deal=deal)
    rendered_subject, rendered_body = render_email_template(
        template.subject, template.body_html, context
    )

    return Response({
        "subject": rendered_subject,
        "body_html": rendered_body,
    })
```

**Step 3: Add URL routes**

Add to `backend/emails/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    # OAuth
    path("connect/gmail/", views.connect_gmail, name="email-connect-gmail"),
    path("callback/gmail/", views.callback_gmail, name="email-callback-gmail"),
    path("connect/outlook/", views.connect_outlook, name="email-connect-outlook"),
    path("callback/outlook/", views.callback_outlook, name="email-callback-outlook"),
    # Account management
    path("accounts/", views.list_accounts, name="email-accounts"),
    path("accounts/<uuid:account_id>/", views.disconnect_account, name="email-disconnect"),
    # Send
    path("send/", views.send_email_view, name="email-send"),
    # Templates
    path("templates/", views.template_list_create, name="email-templates"),
    path("templates/<uuid:template_id>/", views.template_detail, name="email-template-detail"),
    path("templates/<uuid:template_id>/render/", views.template_render, name="email-template-render"),
]
```

**Step 4: Commit**

```bash
git add backend/emails/serializers.py backend/emails/views.py backend/emails/urls.py
git commit -m "feat(emails): add template CRUD API endpoints and render endpoint"
```

---

## Task 4: Backend API Tests

**Files:**
- Create: `backend/emails/tests/test_template_views.py`

**Step 1: Write API tests**

Create `backend/emails/tests/test_template_views.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact
from emails.models import EmailTemplate


class EmailTemplateAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", password="testpass123",
            first_name="Test", last_name="User",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com", password="testpass123",
            first_name="Other", last_name="User",
        )
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        Membership.objects.create(user=self.user, organization=self.org, role="owner")
        Membership.objects.create(user=self.other_user, organization=self.org, role="member")

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        # Set organization header (check how OrganizationMiddleware works)
        self.client.defaults["HTTP_X_ORGANIZATION_ID"] = str(self.org.id)

        self.template = EmailTemplate.objects.create(
            organization=self.org,
            created_by=self.user,
            name="Relance devis",
            subject="Suite a notre echange, {{contact.first_name}}",
            body_html="<p>Bonjour {{contact.first_name}}</p>",
            tags=["relance", "devis"],
            is_shared=False,
        )

    def test_list_returns_own_templates(self):
        resp = self.client.get("/api/email/templates/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["name"], "Relance devis")

    def test_list_returns_shared_templates_from_others(self):
        EmailTemplate.objects.create(
            organization=self.org, created_by=self.other_user,
            name="Shared", subject="Hi", body_html="<p>Hi</p>",
            is_shared=True,
        )
        resp = self.client.get("/api/email/templates/")
        self.assertEqual(resp.status_code, 200)
        names = [t["name"] for t in resp.data]
        self.assertIn("Shared", names)

    def test_list_hides_private_templates_from_others(self):
        EmailTemplate.objects.create(
            organization=self.org, created_by=self.other_user,
            name="Private", subject="Hi", body_html="<p>Hi</p>",
            is_shared=False,
        )
        resp = self.client.get("/api/email/templates/")
        names = [t["name"] for t in resp.data]
        self.assertNotIn("Private", names)

    def test_create_template(self):
        resp = self.client.post("/api/email/templates/", {
            "name": "Nouveau",
            "subject": "Hello {{contact.first_name}}",
            "body_html": "<p>Content</p>",
            "tags": ["test"],
            "is_shared": True,
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["name"], "Nouveau")
        self.assertTrue(resp.data["is_shared"])

    def test_update_own_template(self):
        resp = self.client.put(
            f"/api/email/templates/{self.template.id}/",
            {"name": "Updated"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["name"], "Updated")

    def test_cannot_update_others_template(self):
        shared = EmailTemplate.objects.create(
            organization=self.org, created_by=self.other_user,
            name="Shared", subject="Hi", body_html="<p>Hi</p>",
            is_shared=True,
        )
        resp = self.client.put(
            f"/api/email/templates/{shared.id}/",
            {"name": "Hacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_delete_own_template(self):
        resp = self.client.delete(f"/api/email/templates/{self.template.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(EmailTemplate.objects.filter(id=self.template.id).exists())

    def test_render_template(self):
        contact = Contact.objects.create(
            organization=self.org, created_by=self.user,
            first_name="Jean", last_name="Dupont", email="jean@test.com",
        )
        resp = self.client.post(
            f"/api/email/templates/{self.template.id}/render/",
            {"contact_id": str(contact.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["subject"], "Suite a notre echange, Jean")
        self.assertEqual(resp.data["body_html"], "<p>Bonjour Jean</p>")

    def test_search_filter(self):
        resp = self.client.get("/api/email/templates/?search=relance")
        self.assertEqual(len(resp.data), 1)
        resp = self.client.get("/api/email/templates/?search=introuvable")
        self.assertEqual(len(resp.data), 0)

    def test_tag_filter(self):
        resp = self.client.get("/api/email/templates/?tag=devis")
        self.assertEqual(len(resp.data), 1)
        resp = self.client.get("/api/email/templates/?tag=unknown")
        self.assertEqual(len(resp.data), 0)
```

**Step 2: Run tests**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test emails.tests.test_template_views -v2`

Note: If tests fail due to the organization middleware header, check how `request.organization` is set. Look at `backend/organizations/middleware.py` for the correct header name and adjust `HTTP_X_ORGANIZATION_ID` accordingly.

Expected: All tests PASS

**Step 3: Commit**

```bash
git add backend/emails/tests/test_template_views.py
git commit -m "test(emails): add API tests for email template CRUD and render"
```

---

## Task 5: Integrate template_id into send_email service

**Files:**
- Modify: `backend/emails/service.py`
- Modify: `backend/emails/serializers.py`
- Modify: `backend/emails/tests/test_service.py`

**Step 1: Write the failing test**

Add to `backend/emails/tests/test_service.py`:

```python
    @patch("emails.service._send_via_gmail")
    @patch("emails.service.get_valid_access_token")
    def test_send_with_template_resolves_variables(self, mock_token, mock_send):
        from emails.models import EmailTemplate

        mock_token.return_value = "valid_token"
        mock_send.return_value = "msg_id_456"

        template = EmailTemplate.objects.create(
            organization=self.org,
            created_by=self.user,
            name="Relance",
            subject="Bonjour {{contact.first_name}}",
            body_html="<p>Cher {{contact.first_name}} {{contact.last_name}}</p>",
        )

        sent = send_email(
            user=self.user,
            organization=self.org,
            contact_id=str(self.contact.id),
            subject="ignored",
            body_html="<p>ignored</p>",
            template_id=str(template.id),
        )

        self.assertEqual(sent.subject, "Bonjour Jean")
        self.assertIn("Cher Jean Dupont", sent.body_html)
        self.assertEqual(sent.template, template)
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test emails.tests.test_service.SendEmailServiceTests.test_send_with_template_resolves_variables -v2`
Expected: FAIL — `send_email() got an unexpected keyword argument 'template_id'`

**Step 3: Modify send_email in service.py**

In `backend/emails/service.py`, update the function signature and add template handling:

Add import at top:
```python
from .models import EmailAccount, SentEmail, EmailTemplate
from .template_rendering import render_email_template, build_template_context
```

Update `send_email` signature to add `template_id: str | None = None`:

```python
def send_email(
    user,
    organization,
    subject: str,
    body_html: str,
    contact_id: str | None = None,
    to_email: str = "",
    provider: str = "",
    template_id: str | None = None,
) -> SentEmail:
```

After resolving the contact (after `if not to_email: raise ValueError(...)`) and before resolving the email account, add:

```python
    # Resolve template if provided
    template = None
    if template_id:
        try:
            template = EmailTemplate.objects.get(id=template_id, organization=organization)
        except EmailTemplate.DoesNotExist:
            raise ValueError(f"Template {template_id} introuvable.")
        context = build_template_context(contact=contact)
        subject, body_html = render_email_template(template.subject, template.body_html, context)
```

In the `SentEmail.objects.create(...)` call, add `template=template`:

```python
    sent = SentEmail.objects.create(
        organization=organization,
        sender=user,
        email_account=account,
        contact=contact,
        template=template,
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        provider_message_id=message_id,
    )
```

**Step 4: Add template_id to SendEmailSerializer**

In `backend/emails/serializers.py`, add to `SendEmailSerializer`:

```python
    template_id = serializers.UUIDField(required=False, allow_null=True)
```

**Step 5: Run all email tests**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test emails -v2`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add backend/emails/service.py backend/emails/serializers.py backend/emails/tests/test_service.py
git commit -m "feat(emails): support template_id in send_email service"
```

---

## Task 6: Frontend Types & API Service

**Files:**
- Modify: `frontend/types/emails.ts`
- Modify: `frontend/services/emails.ts`

**Step 1: Add EmailTemplate type**

Add to `frontend/types/emails.ts`:

```typescript
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  tags: string[]
  is_shared: boolean
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface RenderedTemplate {
  subject: string
  body_html: string
}
```

**Step 2: Add API functions**

Add to `frontend/services/emails.ts`:

```typescript
import type { EmailAccount, EmailTemplate, RenderedTemplate } from "@/types"

export async function fetchEmailTemplates(params?: {
  search?: string
  tag?: string
  mine_only?: boolean
  shared_only?: boolean
}): Promise<EmailTemplate[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.tag) searchParams.set("tag", params.tag)
  if (params?.mine_only) searchParams.set("mine_only", "true")
  if (params?.shared_only) searchParams.set("shared_only", "true")
  const qs = searchParams.toString()
  return apiFetch<EmailTemplate[]>(`/email/templates/${qs ? `?${qs}` : ""}`)
}

export async function fetchEmailTemplate(id: string): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/email/templates/${id}/`)
}

export async function createEmailTemplate(
  data: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/email/templates/`, {
    method: "POST",
    json: data,
  })
}

export async function updateEmailTemplate(
  id: string,
  data: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/email/templates/${id}/`, {
    method: "PUT",
    json: data,
  })
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiFetch(`/email/templates/${id}/`, { method: "DELETE" })
}

export async function renderEmailTemplate(
  id: string,
  data: { contact_id?: string; deal_id?: string }
): Promise<RenderedTemplate> {
  return apiFetch<RenderedTemplate>(`/email/templates/${id}/render/`, {
    method: "POST",
    json: data,
  })
}
```

**Step 3: Update types/index.ts if needed**

Check if `frontend/types/index.ts` re-exports from `emails.ts`. If so, add the new types to the re-export.

**Step 4: Commit**

```bash
git add frontend/types/emails.ts frontend/services/emails.ts
git commit -m "feat(frontend): add email template types and API service functions"
```

---

## Task 7: TipTap Variable Node Extension

**Files:**
- Create: `frontend/components/emails/VariableNode.tsx`
- Create: `frontend/components/emails/VariableMenu.tsx`

**Step 1: Create the TipTap custom node for variables**

Create `frontend/components/emails/VariableNode.tsx`:

```tsx
import { Node, mergeAttributes } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"

const VARIABLE_OPTIONS = [
  { group: "Contact", variables: [
    { value: "contact.first_name", label: "Prénom" },
    { value: "contact.last_name", label: "Nom" },
    { value: "contact.email", label: "Email" },
    { value: "contact.company", label: "Entreprise" },
    { value: "contact.phone", label: "Téléphone" },
  ]},
  { group: "Deal", variables: [
    { value: "deal.name", label: "Nom du deal" },
    { value: "deal.amount", label: "Montant" },
    { value: "deal.stage", label: "Étape" },
  ]},
]

export { VARIABLE_OPTIONS }

function VariableNodeView({ node }: { node: { attrs: { variable: string } } }) {
  const label = VARIABLE_OPTIONS
    .flatMap((g) => g.variables)
    .find((v) => v.value === node.attrs.variable)?.label || node.attrs.variable

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium"
        contentEditable={false}
      >
        {`{{${label}}}`}
      </span>
    </NodeViewWrapper>
  )
}

export const TemplateVariable = Node.create({
  name: "templateVariable",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      variable: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, {
      "data-variable": HTMLAttributes.variable,
    }), `{{${HTMLAttributes.variable}}}`]
  },

  renderText({ node }) {
    return `{{${node.attrs.variable}}}`
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView)
  },
})
```

**Step 2: Create variable insertion dropdown**

Create `frontend/components/emails/VariableMenu.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Variable } from "lucide-react"
import { VARIABLE_OPTIONS } from "./VariableNode"
import type { Editor } from "@tiptap/react"
import { cn } from "@/lib/utils"

interface VariableMenuProps {
  editor: Editor
}

export function VariableMenu({ editor }: VariableMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const insert = (variable: string) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "templateVariable", attrs: { variable } })
      .run()
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Insérer une variable"
        className={cn(
          "p-1.5 rounded-md hover:bg-accent transition-colors",
          open && "bg-accent text-accent-foreground"
        )}
      >
        <Variable className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg z-50 py-1">
          {VARIABLE_OPTIONS.map((group) => (
            <div key={group.group}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {group.group}
              </div>
              {group.variables.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => insert(v.value)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  {v.label} <span className="text-muted-foreground text-xs ml-1">{`{{${v.value}}}`}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/components/emails/VariableNode.tsx frontend/components/emails/VariableMenu.tsx
git commit -m "feat(frontend): add TipTap variable node extension and insertion menu"
```

---

## Task 8: Email Template Editor Component

**Files:**
- Create: `frontend/components/emails/EmailTemplateEditor.tsx`

**Step 1: Create the editor component**

This component wraps TipTap with the variable extension and template-specific toolbar. It outputs HTML (not markdown like the RichTextEditor).

Create `frontend/components/emails/EmailTemplateEditor.tsx`:

```tsx
"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { useCallback } from "react"
import {
  Bold, Italic, List, ListOrdered,
  ImageIcon, Link as LinkIcon, Minus,
  Undo, Redo,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TemplateVariable } from "./VariableNode"
import { VariableMenu } from "./VariableMenu"

interface EmailTemplateEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function EmailTemplateEditor({
  content,
  onChange,
  placeholder = "Rédigez votre template...",
}: EmailTemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TemplateVariable,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1",
          "font-[family-name:var(--font-body)]"
        ),
        style: "min-height: 200px",
      },
    },
  })

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt("URL du lien", editor.getAttributes("link").href)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick, isActive, children, title,
  }: {
    onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md hover:bg-accent transition-colors",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/60">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Gras">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italique">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Liste">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Liste numérotée">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="Lien">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <VariableMenu editor={editor} />
        <div className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler">
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/emails/EmailTemplateEditor.tsx
git commit -m "feat(frontend): add EmailTemplateEditor with variable support"
```

---

## Task 9: Template List Page (Settings)

**Files:**
- Create: `frontend/app/(app)/settings/email-templates/page.tsx`

**Step 1: Create the template list page**

Create `frontend/app/(app)/settings/email-templates/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Trash2, Users, User, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchEmailTemplates, deleteEmailTemplate } from "@/services/emails"
import type { EmailTemplate } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all")
  const [loading, setLoading] = useState(true)

  const loadTemplates = async () => {
    try {
      const data = await fetchEmailTemplates({
        search: search || undefined,
        mine_only: filter === "mine" || undefined,
        shared_only: filter === "shared" || undefined,
      })
      setTemplates(data)
    } catch {
      toast.error("Erreur lors du chargement des templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [search, filter])

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return
    try {
      await deleteEmailTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success("Template supprimé")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Templates d&apos;email</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Créez et gérez vos modèles d&apos;emails réutilisables
          </p>
        </div>
        <Link href="/settings/email-templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau template
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 font-[family-name:var(--font-body)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un template..."
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { key: "all" as const, label: "Tous" },
            { key: "mine" as const, label: "Mes templates", icon: User },
            { key: "shared" as const, label: "Partagés", icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                filter === key ? "bg-secondary text-foreground" : "hover:bg-secondary/50 text-muted-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Template list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Aucun template trouvé
          </div>
        ) : (
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/settings/email-templates/${template.id}`}
              className="block rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="space-y-1 font-[family-name:var(--font-body)]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{template.name}</p>
                    {template.is_shared && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Users className="h-3 w-3 mr-1" />
                        Partagé
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{template.subject}</p>
                  {template.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(template.id)
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/settings/email-templates/page.tsx
git commit -m "feat(frontend): add email templates list page in settings"
```

---

## Task 10: Template Create/Edit Page

**Files:**
- Create: `frontend/app/(app)/settings/email-templates/[id]/page.tsx`

**Step 1: Create the template editor page**

Create `frontend/app/(app)/settings/email-templates/[id]/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { EmailTemplateEditor } from "@/components/emails/EmailTemplateEditor"
import {
  fetchEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  renderEmailTemplate,
} from "@/services/emails"
import { toast } from "sonner"
import { ArrowLeft, Eye, Save, X } from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function EmailTemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === "new"

  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isShared, setIsShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewSubject, setPreviewSubject] = useState("")

  useEffect(() => {
    if (!isNew && params.id) {
      fetchEmailTemplate(params.id as string).then((t) => {
        setName(t.name)
        setSubject(t.subject)
        setBodyHtml(t.body_html)
        setTags(t.tags)
        setIsShared(t.is_shared)
      }).catch(() => {
        toast.error("Template introuvable")
        router.push("/settings/email-templates")
      })
    }
  }, [params.id, isNew, router])

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Le nom et l'objet sont requis")
      return
    }
    setSaving(true)
    try {
      const data = { name, subject, body_html: bodyHtml, tags, is_shared: isShared }
      if (isNew) {
        const created = await createEmailTemplate(data)
        toast.success("Template créé")
        router.push(`/settings/email-templates/${created.id}`)
      } else {
        await updateEmailTemplate(params.id as string, data)
        toast.success("Template mis à jour")
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    if (isNew) {
      toast.error("Sauvegardez d'abord le template")
      return
    }
    try {
      const rendered = await renderEmailTemplate(params.id as string, {})
      setPreviewSubject(rendered.subject)
      setPreviewHtml(rendered.body_html)
      setPreviewOpen(true)
    } catch {
      toast.error("Erreur lors de la preview")
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput("")
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings/email-templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl tracking-tight">
            {isNew ? "Nouveau template" : "Modifier le template"}
          </h1>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6 space-y-5 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nom du template</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Relance après devis"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Objet de l&apos;email
              <span className="ml-1 text-muted-foreground/60">(supporte les variables)</span>
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Suite à notre échange, {{contact.first_name}}"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Corps de l&apos;email</Label>
            <EmailTemplateEditor content={bodyHtml} onChange={setBodyHtml} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Ajouter un tag..."
                className="flex-1"
              />
              <Button variant="outline" onClick={addTag} type="button">
                Ajouter
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={isShared}
              onCheckedChange={(checked) => setIsShared(!!checked)}
            />
            <Label className="text-sm">Partager avec l&apos;organisation</Label>
          </div>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewSubject}</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-lg font-[family-name:var(--font-body)]"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/settings/email-templates/\[id\]/page.tsx
git commit -m "feat(frontend): add email template create/edit page with TipTap editor"
```

---

## Task 11: Add Navigation Link in Settings

**Files:**
- Modify: `frontend/app/(app)/settings/page.tsx`

**Step 1: Add email templates link card**

In `frontend/app/(app)/settings/page.tsx`, add a `FileText` import from lucide-react and add a link card before the Organization settings link (before line 331). Add after the duplicate detection settings section and before the Organization link:

```tsx
      {/* Email templates link */}
      <Link href="/settings/email-templates" className="block">
        <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="font-[family-name:var(--font-body)]">
                <p className="text-sm font-medium">Templates d&apos;email</p>
                <p className="text-xs text-muted-foreground">
                  Créer et gérer des modèles d&apos;emails réutilisables
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Link>
```

Note: `Mail` and `ChevronRight` are already imported. No new imports needed.

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/settings/page.tsx
git commit -m "feat(frontend): add email templates link in settings page"
```

---

## Task 12: Integrate Template Picker in ComposeEmailDialog

**Files:**
- Modify: `frontend/components/emails/ComposeEmailDialog.tsx`

**Step 1: Add template selection to ComposeEmailDialog**

Modify `frontend/components/emails/ComposeEmailDialog.tsx`:

1. Add imports:
```tsx
import { fetchEmailTemplates } from "@/services/emails"
import type { EmailAccount, EmailTemplate } from "@/types"
import { FileText } from "lucide-react"
```

2. Add state for templates:
```tsx
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
```

3. In the `useEffect` that runs on `open`, also fetch templates:
```tsx
  useEffect(() => {
    if (open) {
      fetchEmailAccounts()
        .then((data) => {
          setAccounts(data.filter((a) => a.is_active))
          if (data.length === 1) {
            setSelectedProvider(data[0].provider)
          }
        })
        .catch(() => {})
      fetchEmailTemplates().then(setTemplates).catch(() => {})
    }
  }, [open])
```

4. Add a template picker button and dropdown above the subject field (after the "À" field). When a template is selected, populate subject and body:
```tsx
          {/* Template picker */}
          {templates.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full justify-start text-muted-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                Utiliser un template
              </Button>
              {showTemplates && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSubject(t.subject)
                        setBody(t.body_html.replace(/<[^>]*>/g, "\n").replace(/\n{2,}/g, "\n").trim())
                        setShowTemplates(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-muted-foreground block">{t.subject}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
```

**Step 2: Commit**

```bash
git add frontend/components/emails/ComposeEmailDialog.tsx
git commit -m "feat(frontend): add template picker to ComposeEmailDialog"
```

---

## Task 13: Integrate Template Selector in Workflow ActionConfig

**Files:**
- Modify: `frontend/components/workflows/NodeConfigForms/ActionConfig.tsx`

**Step 1: Add template selector to send_email action**

Modify `frontend/components/workflows/NodeConfigForms/ActionConfig.tsx`:

1. Add imports and state at top:
```tsx
import { useState, useEffect } from "react"
import { fetchEmailTemplates } from "@/services/emails"
import type { EmailTemplate } from "@/types"
```

2. Inside the component, add state and effect:
```tsx
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])

  useEffect(() => {
    if (nodeSubtype === "send_email") {
      fetchEmailTemplates().then(setEmailTemplates).catch(() => {})
    }
  }, [nodeSubtype])
```

3. In the `send_email` section (line 155), add a template selector before the subject input:
```tsx
      {nodeSubtype === "send_email" && (
        <>
          {emailTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Template (optionnel)
              </Label>
              <select
                value={(config.template_id as string) || ""}
                onChange={(e) => {
                  const templateId = e.target.value
                  updateConfig("template_id", templateId || null)
                  if (templateId) {
                    const tpl = emailTemplates.find((t) => t.id === templateId)
                    if (tpl) {
                      updateConfig("subject", tpl.subject)
                      updateConfig("body_template", tpl.body_html)
                    }
                  }
                }}
                className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
              >
                <option value="">Aucun template</option>
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Keep existing subject and body_template inputs */}
```

**Step 2: Commit**

```bash
git add frontend/components/workflows/NodeConfigForms/ActionConfig.tsx
git commit -m "feat(frontend): add template selector in workflow email action config"
```

---

## Task 14: Integrate Templates in Workflow Backend

**Files:**
- Modify: `backend/workflows/actions.py`

**Step 1: Update _action_send_email to support template_id**

In `backend/workflows/actions.py`, modify `_action_send_email`:

After `body_html = "".join(...)` block (around line 184), add template resolution:

```python
    # If a template_id is provided, load and render it
    template_id = config.get("template_id")
    if template_id:
        from emails.models import EmailTemplate
        from emails.template_rendering import render_email_template
        try:
            template = EmailTemplate.objects.get(id=template_id)
            subject, body_html = render_email_template(template.subject, template.body_html, context)
        except EmailTemplate.DoesNotExist:
            pass  # Fall back to config subject/body
```

This should be placed right after the `body_html` construction and before the recipient list building.

**Step 2: Commit**

```bash
git add backend/workflows/actions.py
git commit -m "feat(workflows): support template_id in send_email action"
```

---

## Task 15: Add Chat AI Tools for Templates

**Files:**
- Modify: `backend/chat/tools.py`

**Step 1: Add list_email_templates tool**

Add to `backend/chat/tools.py`, before the `ALL_TOOLS` list:

```python
# ---------------------------------------------------------------------------
# Email Templates
# ---------------------------------------------------------------------------

def list_email_templates(ctx: RunContext[ChatDeps]) -> dict:
    """List available email templates for the current organization.
    Use when the user wants to see available email templates or choose a template to send."""
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id
    templates = EmailTemplate.objects.filter(
        Q(created_by_id=user_id, organization_id=org_id)
        | Q(is_shared=True, organization_id=org_id)
    )[:20]

    results = [
        {
            "id": str(t.id),
            "name": t.name,
            "subject": t.subject,
            "tags": t.tags,
            "is_shared": t.is_shared,
        }
        for t in templates
    ]
    return {"action": "list_email_templates", "count": len(results), "templates": results}


def send_email_from_template(
    ctx: RunContext[ChatDeps],
    template_id: str,
    contact_id: str,
) -> dict:
    """Send an email to a contact using a pre-defined email template.
    The template's subject and body variables will be automatically resolved with the contact's data.
    Use when the user asks to send an email using a specific template."""
    from accounts.models import User
    from organizations.models import Organization
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    # Verify template exists
    try:
        EmailTemplate.objects.get(
            Q(created_by_id=user_id, organization_id=org_id)
            | Q(is_shared=True, organization_id=org_id),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return {"action": "error", "message": "Template introuvable."}

    account = EmailAccount.objects.filter(
        user_id=user_id, organization_id=org_id, is_active=True,
    ).first()
    if not account:
        return {
            "action": "error",
            "message": "Aucun compte email connecté. Connectez votre Gmail ou Outlook dans Paramètres.",
        }

    try:
        user = User.objects.get(id=user_id)
        org = Organization.objects.get(id=org_id)
        sent = service_send_email(
            user=user,
            organization=org,
            contact_id=contact_id,
            subject="",  # Will be overridden by template
            body_html="",  # Will be overridden by template
            template_id=template_id,
        )
    except (ValueError, PermissionError) as e:
        return {"action": "error", "message": str(e)}
    except Exception:
        return {"action": "error", "message": "Erreur lors de l'envoi de l'email."}

    return {
        "action": "email_sent_from_template",
        "to": sent.to_email,
        "subject": sent.subject,
        "template_id": template_id,
    }
```

**Step 2: Add to ALL_TOOLS list**

Add `list_email_templates` and `send_email_from_template` to the `ALL_TOOLS` list:

```python
ALL_TOOLS = [
    # ... existing tools ...
    send_contact_email,
    list_email_templates,
    send_email_from_template,
    # ...
]
```

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add email template tools for AI agent"
```

---

## Task 16: Update types/index.ts re-exports

**Files:**
- Modify: `frontend/types/index.ts` (if it exists and re-exports)

**Step 1: Check and update re-exports**

Check if `frontend/types/index.ts` exists. If it does and re-exports from `emails.ts`, add:

```typescript
export type { EmailTemplate, RenderedTemplate } from "./emails"
```

If the project uses direct imports from `@/types/emails`, no changes needed.

**Step 2: Verify frontend builds**

Run: `cd /Users/hugofrely/dev/crm-qeylo/frontend && npm run build`

Fix any TypeScript errors that arise.

**Step 3: Commit if changes were needed**

```bash
git add frontend/types/
git commit -m "fix(frontend): update type re-exports for email templates"
```

---

## Task 17: Run All Backend Tests

**Step 1: Run the full test suite**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test -v2`

**Step 2: Fix any failures**

Address any test failures. Common issues:
- Organization middleware header format in API tests
- Import paths
- Missing `__init__.py` in test directories

**Step 3: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix(emails): address test failures"
```

---

## Task 18: Final Verification & Cleanup

**Step 1: Run frontend build**

Run: `cd /Users/hugofrely/dev/crm-qeylo/frontend && npm run build`

**Step 2: Run backend tests**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test emails -v2`

**Step 3: Verify all files are committed**

Run: `git status`

If clean, the feature is complete.
