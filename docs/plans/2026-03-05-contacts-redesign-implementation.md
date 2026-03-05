# Contacts Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refonte complète des contacts — catégories personnalisables, champs custom typés, nouvelle page détail avec onglets, intégration chat IA.

**Architecture:** Nouveaux modèles `ContactCategory` et `CustomFieldDefinition` liés à l'Organisation. Valeurs custom fields stockées dans un JSONField sur Contact. API REST pour CRUD catégories/custom fields. Frontend avec onglets catégories sur la liste et layout 2 colonnes sur le détail.

**Tech Stack:** Django 5 / DRF, Next.js 16 / React 19, Tailwind CSS 4, Radix UI, dnd-kit (pour le réordonnement), Lucide icons.

**Design doc:** `docs/plans/2026-03-05-contacts-redesign-design.md`

---

## Task 1: Backend — Modèles ContactCategory et CustomFieldDefinition

**Files:**
- Modify: `backend/contacts/models.py`
- Create: `backend/contacts/migrations/0003_....py` (auto-generated)

**Step 1: Add ContactCategory model to contacts/models.py**

Add after the existing Contact model imports:

```python
class ContactCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="contact_categories",
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#3b82f6")
    icon = models.CharField(max_length=50, blank=True, default="")
    order = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["order", "name"]

    def __str__(self):
        return self.name
```

**Step 2: Add CustomFieldDefinition model**

```python
class CustomFieldDefinition(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Texte"
        LONG_TEXT = "long_text", "Texte long"
        NUMBER = "number", "Nombre"
        DATE = "date", "Date"
        SELECT = "select", "Sélection"
        EMAIL = "email", "Email"
        PHONE = "phone", "Téléphone"
        URL = "url", "URL"
        CHECKBOX = "checkbox", "Case à cocher"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="custom_field_definitions",
    )
    label = models.CharField(max_length=150)
    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices,
        default=FieldType.TEXT,
    )
    is_required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    order = models.IntegerField(default=0)
    section = models.CharField(max_length=50, default="custom")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "label"]

    def __str__(self):
        return f"{self.label} ({self.field_type})"
```

**Step 3: Add new fields to the Contact model**

Add these fields to the existing Contact model:

```python
    # In the Contact model, add:
    categories = models.ManyToManyField(
        "contacts.ContactCategory",
        blank=True,
        related_name="contacts",
    )
    custom_fields = models.JSONField(default=dict, blank=True)

    # Address fields (split from existing address TextField)
    city = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")

    # Additional contact fields
    secondary_email = models.EmailField(blank=True, default="")
    secondary_phone = models.CharField(max_length=20, blank=True, default="")
    mobile_phone = models.CharField(max_length=20, blank=True, default="")
    twitter_url = models.URLField(blank=True, default="")
    siret = models.CharField(max_length=14, blank=True, default="")
```

**Step 4: Generate and run migration**

Run: `docker compose exec backend python manage.py makemigrations contacts`
Run: `docker compose exec backend python manage.py migrate`

**Step 5: Commit**

```bash
git add backend/contacts/models.py backend/contacts/migrations/
git commit -m "feat(contacts): add ContactCategory, CustomFieldDefinition models and new Contact fields"
```

---

## Task 2: Backend — Data migration for default categories

**Files:**
- Create: `backend/contacts/migrations/0004_default_categories.py` (manually created data migration)

**Step 1: Create data migration**

Run: `docker compose exec backend python manage.py makemigrations contacts --empty -n default_categories`

**Step 2: Write the migration**

```python
from django.db import migrations


DEFAULT_CATEGORIES = [
    {"name": "Non contacté", "color": "#3b82f6", "order": 0},
    {"name": "Prospect", "color": "#eab308", "order": 1},
    {"name": "Qualifié", "color": "#f97316", "order": 2},
    {"name": "Client", "color": "#22c55e", "order": 3},
    {"name": "Ancien client", "color": "#ef4444", "order": 4},
    {"name": "Partenaire", "color": "#a855f7", "order": 5},
    {"name": "VIP", "color": "#f59e0b", "order": 6},
]


def create_default_categories(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    ContactCategory = apps.get_model("contacts", "ContactCategory")

    for org in Organization.objects.all():
        for cat in DEFAULT_CATEGORIES:
            ContactCategory.objects.get_or_create(
                organization=org,
                name=cat["name"],
                defaults={
                    "color": cat["color"],
                    "order": cat["order"],
                    "is_default": True,
                },
            )


def reverse(apps, schema_editor):
    ContactCategory = apps.get_model("contacts", "ContactCategory")
    ContactCategory.objects.filter(is_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("contacts", "0003_..."),  # Replace with actual migration name from Task 1
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_categories, reverse),
    ]
```

**Step 3: Run migration**

Run: `docker compose exec backend python manage.py migrate`

**Step 4: Commit**

```bash
git add backend/contacts/migrations/
git commit -m "feat(contacts): add default categories data migration"
```

---

## Task 3: Backend — Serializers for categories and custom fields

**Files:**
- Modify: `backend/contacts/serializers.py`

**Step 1: Add ContactCategorySerializer**

```python
from .models import Contact, ContactCategory, CustomFieldDefinition


class ContactCategorySerializer(serializers.ModelSerializer):
    contact_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = ContactCategory
        fields = ["id", "name", "color", "icon", "order", "is_default", "contact_count", "created_at"]
        read_only_fields = ["id", "is_default", "created_at"]
```

**Step 2: Add CustomFieldDefinitionSerializer**

```python
class CustomFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFieldDefinition
        fields = ["id", "label", "field_type", "is_required", "options", "order", "section", "created_at"]
        read_only_fields = ["id", "created_at"]
```

**Step 3: Update ContactSerializer**

Add categories and custom fields to the existing serializer. Add the new Contact fields. Add validation for custom_fields values.

```python
class ContactSerializer(serializers.ModelSerializer):
    categories = ContactCategorySerializer(many=True, read_only=True)
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Contact
        fields = [
            # Existing fields...
            "id", "first_name", "last_name", "email", "phone",
            "company", "source", "tags", "notes",
            "job_title", "linkedin_url", "website", "address", "industry",
            "lead_score", "estimated_budget", "identified_needs", "decision_role",
            "preferred_channel", "timezone", "language", "interests", "birthday",
            "ai_summary", "ai_summary_updated_at",
            "created_at", "updated_at",
            # New fields
            "categories", "category_ids", "custom_fields",
            "city", "postal_code", "country", "state",
            "secondary_email", "secondary_phone", "mobile_phone",
            "twitter_url", "siret",
        ]
        read_only_fields = ["id", "ai_summary_updated_at", "created_at", "updated_at"]

    def validate_custom_fields(self, value):
        """Validate custom field values against their definitions."""
        if not value:
            return value

        request = self.context.get("request")
        if not request:
            return value

        definitions = {
            str(d.id): d
            for d in CustomFieldDefinition.objects.filter(
                organization=request.organization
            )
        }

        for field_id, field_value in value.items():
            if field_id not in definitions:
                raise serializers.ValidationError(
                    f"Champ personnalisé inconnu: {field_id}"
                )
            defn = definitions[field_id]
            if defn.field_type == "number" and field_value is not None:
                try:
                    float(field_value)
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f"Le champ '{defn.label}' doit être un nombre."
                    )
            if defn.field_type == "select" and field_value:
                if field_value not in defn.options:
                    raise serializers.ValidationError(
                        f"Valeur invalide pour '{defn.label}'. Options: {defn.options}"
                    )

        return value

    def create(self, validated_data):
        category_ids = validated_data.pop("category_ids", [])
        instance = super().create(validated_data)
        if category_ids:
            instance.categories.set(category_ids)
        return instance

    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        instance = super().update(instance, validated_data)
        if category_ids is not None:
            instance.categories.set(category_ids)
        return instance
```

**Step 4: Commit**

```bash
git add backend/contacts/serializers.py
git commit -m "feat(contacts): add serializers for categories, custom fields, and updated contact"
```

---

## Task 4: Backend — Views and URLs for categories

**Files:**
- Modify: `backend/contacts/views.py`
- Modify: `backend/contacts/urls.py`

**Step 1: Add CategoryViewSet to views.py**

```python
from .models import Contact, ContactCategory, CustomFieldDefinition
from .serializers import ContactSerializer, ContactCategorySerializer, CustomFieldDefinitionSerializer
from django.db.models import Count


class ContactCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ContactCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ContactCategory.objects.filter(organization=self.request.organization)
            .annotate(contact_count=Count("contacts"))
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    def perform_destroy(self, instance):
        if instance.is_default:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Impossible de supprimer une catégorie par défaut.")
        instance.delete()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_categories(request):
    order = request.data.get("order", [])
    for index, category_id in enumerate(order):
        ContactCategory.objects.filter(
            id=category_id,
            organization=request.organization,
        ).update(order=index)
    return Response({"status": "ok"})
```

**Step 2: Add category filter to ContactViewSet.get_queryset**

Update the existing `get_queryset` method in `ContactViewSet`:

```python
    def get_queryset(self):
        qs = Contact.objects.filter(organization=self.request.organization)
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(categories__id=category_id)
        return qs.distinct()
```

**Step 3: Update urls.py**

```python
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ContactViewSet, basename="contact")

category_router = DefaultRouter()
category_router.register("", views.ContactCategoryViewSet, basename="contact-category")

urlpatterns = [
    path("search/", views.search_contacts),
    path("categories/reorder/", views.reorder_categories),
    path("categories/", include(category_router.urls)),
    path("", include(router.urls)),
]
```

**Step 4: Commit**

```bash
git add backend/contacts/views.py backend/contacts/urls.py
git commit -m "feat(contacts): add category CRUD endpoints with filtering and reorder"
```

---

## Task 5: Backend — Views and URLs for custom fields

**Files:**
- Modify: `backend/contacts/views.py`
- Modify: `backend/contacts/urls.py`

**Step 1: Add CustomFieldDefinitionViewSet to views.py**

```python
class CustomFieldDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFieldDefinitionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomFieldDefinition.objects.filter(
            organization=self.request.organization
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    def perform_destroy(self, instance):
        # Remove this field's values from all contacts in the org
        field_id = str(instance.id)
        contacts = Contact.objects.filter(organization=self.request.organization)
        for contact in contacts:
            if field_id in contact.custom_fields:
                del contact.custom_fields[field_id]
                contact.save(update_fields=["custom_fields"])
        instance.delete()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_custom_fields(request):
    order = request.data.get("order", [])
    for index, field_id in enumerate(order):
        CustomFieldDefinition.objects.filter(
            id=field_id,
            organization=request.organization,
        ).update(order=index)
    return Response({"status": "ok"})
```

**Step 2: Update urls.py to add custom fields routes**

```python
custom_field_router = DefaultRouter()
custom_field_router.register("", views.CustomFieldDefinitionViewSet, basename="custom-field")

# Add to urlpatterns before the main router:
    path("custom-fields/reorder/", views.reorder_custom_fields),
    path("custom-fields/", include(custom_field_router.urls)),
```

**Step 3: Commit**

```bash
git add backend/contacts/views.py backend/contacts/urls.py
git commit -m "feat(contacts): add custom field definition CRUD endpoints"
```

---

## Task 6: Backend — Create default categories on new organization

**Files:**
- Modify: `backend/organizations/views.py`

**Step 1: Add helper function and call it in organization creation**

Add a helper function that creates default categories, and call it after organization creation in the `organization_list` view (the POST handler that creates organizations):

```python
# At the top of the file, add import
from contacts.models import ContactCategory

# Add helper function
DEFAULT_CATEGORIES = [
    {"name": "Non contacté", "color": "#3b82f6", "order": 0},
    {"name": "Prospect", "color": "#eab308", "order": 1},
    {"name": "Qualifié", "color": "#f97316", "order": 2},
    {"name": "Client", "color": "#22c55e", "order": 3},
    {"name": "Ancien client", "color": "#ef4444", "order": 4},
    {"name": "Partenaire", "color": "#a855f7", "order": 5},
    {"name": "VIP", "color": "#f59e0b", "order": 6},
]

def create_default_categories(organization):
    for cat in DEFAULT_CATEGORIES:
        ContactCategory.objects.create(
            organization=organization,
            name=cat["name"],
            color=cat["color"],
            order=cat["order"],
            is_default=True,
        )
```

In the existing `organization_list` POST handler, after creating the organization and membership, call `create_default_categories(org)`.

**Step 2: Commit**

```bash
git add backend/organizations/views.py
git commit -m "feat(contacts): create default categories when new organization is created"
```

---

## Task 7: Backend — Chat tools for categories and custom fields

**Files:**
- Modify: `backend/chat/tools.py`
- Modify: `backend/chat/prompts.py`

**Step 1: Add new imports to chat/tools.py**

```python
from contacts.models import Contact, ContactCategory, CustomFieldDefinition
```

**Step 2: Add update_contact_categories tool**

```python
@agent.tool
async def update_contact_categories(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    category_names: list[str],
) -> dict:
    """Met à jour les catégories d'un contact. Remplace toutes les catégories actuelles par celles fournies."""
    contact = _resolve_contact_id(ctx, contact_id)
    if not contact:
        return {"error": "Contact introuvable."}

    org_id = ctx.deps.organization_id
    categories = ContactCategory.objects.filter(
        organization_id=org_id,
        name__in=category_names,
    )
    found_names = set(categories.values_list("name", flat=True))
    not_found = [n for n in category_names if n not in found_names]

    contact.categories.set(categories)

    from notes.models import TimelineEntry
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
        content=f"Catégories mises à jour: {', '.join(found_names)}",
        metadata={"changed_fields": ["categories"]},
    )

    result = {
        "action": "categories_updated",
        "contact": f"{contact.first_name} {contact.last_name}",
        "categories": list(found_names),
    }
    if not_found:
        result["warning"] = f"Catégories introuvables: {', '.join(not_found)}"
    return result
```

**Step 3: Add update_custom_field tool**

```python
@agent.tool
async def update_custom_field(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    field_label: str,
    value: str,
) -> dict:
    """Met à jour un champ personnalisé d'un contact. Utilise le label du champ (ex: 'SIRET', 'TVA')."""
    contact = _resolve_contact_id(ctx, contact_id)
    if not contact:
        return {"error": "Contact introuvable."}

    org_id = ctx.deps.organization_id
    try:
        field_def = CustomFieldDefinition.objects.get(
            organization_id=org_id,
            label__iexact=field_label,
        )
    except CustomFieldDefinition.DoesNotExist:
        return {"error": f"Champ personnalisé '{field_label}' introuvable."}

    # Type conversion
    if field_def.field_type == "number":
        try:
            value = float(value)
        except ValueError:
            return {"error": f"Le champ '{field_label}' attend un nombre."}
    elif field_def.field_type == "checkbox":
        value = value.lower() in ("true", "oui", "1", "yes")
    elif field_def.field_type == "select":
        if value not in field_def.options:
            return {"error": f"Valeur invalide. Options: {field_def.options}"}

    if not contact.custom_fields:
        contact.custom_fields = {}
    contact.custom_fields[str(field_def.id)] = value
    contact.save(update_fields=["custom_fields"])

    from notes.models import TimelineEntry
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
        content=f"Champ '{field_def.label}' mis à jour",
        metadata={"changed_fields": [f"custom:{field_def.label}"]},
    )

    return {
        "action": "custom_field_updated",
        "contact": f"{contact.first_name} {contact.last_name}",
        "field": field_def.label,
        "value": value,
    }
```

**Step 4: Update create_contact tool to accept categories**

In the existing `create_contact` tool, add a `categories: str = ""` parameter (comma-separated names). After creating the contact, resolve and set categories:

```python
    # After contact is created:
    if categories:
        cat_names = [n.strip() for n in categories.split(",") if n.strip()]
        cats = ContactCategory.objects.filter(
            organization_id=ctx.deps.organization_id,
            name__in=cat_names,
        )
        contact.categories.set(cats)
```

**Step 5: Update search_contacts tool to accept category filter**

Add `category: str = ""` parameter. If provided, filter by category name:

```python
    if category:
        qs = qs.filter(categories__name__iexact=category)
```

And include categories in the returned results:

```python
    results.append({
        ...existing fields...,
        "categories": list(c.categories.values_list("name", flat=True)),
    })
```

**Step 6: Update prompts.py system prompt**

In `backend/chat/prompts.py`, add dynamic context for categories and custom fields. Add these to the `SYSTEM_PROMPT` template:

```python
## Catégories de contacts disponibles
{categories_list}

## Champs personnalisés disponibles
{custom_fields_list}
```

In the view that builds the prompt context (in `chat/views.py`), fetch and inject:

```python
from contacts.models import ContactCategory, CustomFieldDefinition

categories = ContactCategory.objects.filter(organization=org)
categories_list = ", ".join(c.name for c in categories) if categories else "Aucune"

custom_fields = CustomFieldDefinition.objects.filter(organization=org)
custom_fields_list = ", ".join(
    f"{cf.label} ({cf.get_field_type_display()})" for cf in custom_fields
) if custom_fields else "Aucun"
```

**Step 7: Commit**

```bash
git add backend/chat/tools.py backend/chat/prompts.py backend/chat/views.py
git commit -m "feat(chat): add tools for contact categories and custom fields"
```

---

## Task 8: Frontend — Settings page for categories management

**Files:**
- Modify: `frontend/app/(app)/settings/organization/page.tsx`

**Step 1: Add state and fetch for categories**

Add to the existing organization settings page a new section after members/invitations. Fetch categories from `/api/contacts/categories/`.

State to add:
```typescript
interface ContactCategory {
  id: string
  name: string
  color: string
  icon: string
  order: number
  is_default: boolean
  contact_count: number
}

const [categories, setCategories] = useState<ContactCategory[]>([])
const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
const [editingCategory, setEditingCategory] = useState<ContactCategory | null>(null)
const [categoryForm, setCategoryForm] = useState({ name: "", color: "#3b82f6" })
```

**Step 2: Add CRUD functions for categories**

```typescript
const fetchCategories = async () => {
  try {
    const data = await apiFetch<ContactCategory[]>("/contacts/categories/")
    setCategories(data)
  } catch (err) {
    console.error("Failed to fetch categories:", err)
  }
}

const handleCreateCategory = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    if (editingCategory) {
      await apiFetch(`/contacts/categories/${editingCategory.id}/`, {
        method: "PATCH",
        json: categoryForm,
      })
    } else {
      await apiFetch("/contacts/categories/", {
        method: "POST",
        json: categoryForm,
      })
    }
    setCategoryDialogOpen(false)
    setEditingCategory(null)
    setCategoryForm({ name: "", color: "#3b82f6" })
    fetchCategories()
  } catch (err) {
    console.error("Failed to save category:", err)
  }
}

const handleDeleteCategory = async (id: string) => {
  if (!window.confirm("Supprimer cette catégorie ?")) return
  try {
    await apiFetch(`/contacts/categories/${id}/`, { method: "DELETE" })
    fetchCategories()
  } catch (err) {
    console.error("Failed to delete category:", err)
  }
}
```

**Step 3: Add categories UI section**

Render a section "Catégories de contacts" with:
- List of categories with color dot, name, contact_count badge, is_default badge
- Edit button (pencil icon) and Delete button (trash icon, hidden for is_default)
- "Ajouter une catégorie" button
- Dialog with name input and color picker (simple input type="color")

Use same styling patterns as existing members section: `rounded-xl border border-border bg-card p-6`.

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/settings/organization/page.tsx
git commit -m "feat(settings): add contact categories management UI"
```

---

## Task 9: Frontend — Settings page for custom fields management

**Files:**
- Modify: `frontend/app/(app)/settings/organization/page.tsx`

**Step 1: Add state and fetch for custom fields**

```typescript
interface CustomFieldDefinition {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
  order: number
  section: string
}

const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
const [fieldForm, setFieldForm] = useState({
  label: "",
  field_type: "text",
  is_required: false,
  options: [] as string[],
  section: "custom",
})
```

**Step 2: Add CRUD functions for custom fields**

Same pattern as categories: fetch, create/update, delete.

```typescript
const fetchCustomFields = async () => {
  try {
    const data = await apiFetch<CustomFieldDefinition[]>("/contacts/custom-fields/")
    setCustomFields(data)
  } catch (err) {
    console.error("Failed to fetch custom fields:", err)
  }
}
```

**Step 3: Add custom fields UI section**

Render a section "Champs personnalisés" with:
- List of fields with label, type badge, "Requis" badge if applicable
- Edit and Delete buttons
- "Ajouter un champ" button
- Dialog with: label input, field_type select dropdown (all 9 types), is_required checkbox, options textarea (shown only when field_type="select", one option per line)

Field type labels for display:
```typescript
const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  long_text: "Texte long",
  number: "Nombre",
  date: "Date",
  select: "Sélection",
  email: "Email",
  phone: "Téléphone",
  url: "URL",
  checkbox: "Case à cocher",
}
```

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/settings/organization/page.tsx
git commit -m "feat(settings): add custom fields management UI"
```

---

## Task 10: Frontend — Contacts list page with category tabs

**Files:**
- Modify: `frontend/app/(app)/contacts/page.tsx`
- Modify: `frontend/components/contacts/ContactTable.tsx`

**Step 1: Fetch categories and add tab state**

In `contacts/page.tsx`, add:

```typescript
const [categories, setCategories] = useState<ContactCategory[]>([])
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

useEffect(() => {
  const fetchCategories = async () => {
    try {
      const data = await apiFetch<ContactCategory[]>("/contacts/categories/")
      setCategories(data)
    } catch (err) {
      console.error("Failed to fetch categories:", err)
    }
  }
  fetchCategories()
}, [])
```

**Step 2: Update fetch to include category filter**

In the `fetchContacts` function, add the category filter to the API URL:

```typescript
const categoryParam = selectedCategory ? `&category=${selectedCategory}` : ""
const data = await apiFetch<ContactsResponse>(
  `/contacts/?limit=${PAGE_SIZE}&offset=${offset}${categoryParam}`
)
```

Reset page to 1 when category changes:

```typescript
useEffect(() => {
  setPage(1)
}, [selectedCategory])
```

**Step 3: Add category tabs UI**

Above the table, render a row of tabs:

```tsx
<div className="flex items-center gap-2 overflow-x-auto pb-2">
  <button
    onClick={() => setSelectedCategory(null)}
    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      selectedCategory === null
        ? "bg-primary text-primary-foreground"
        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
    }`}
  >
    Tous
  </button>
  {categories.map((cat) => (
    <button
      key={cat.id}
      onClick={() => setSelectedCategory(cat.id)}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
        selectedCategory === cat.id
          ? "bg-primary text-primary-foreground"
          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
      }`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: cat.color }}
      />
      {cat.name}
      {cat.contact_count > 0 && (
        <span className="text-[10px] opacity-70">({cat.contact_count})</span>
      )}
    </button>
  ))}
</div>
```

**Step 4: Update ContactTable to show category badges**

In `ContactTable.tsx`, add a categories display under the contact name:

```tsx
{contact.categories && contact.categories.length > 0 && (
  <div className="flex items-center gap-1 mt-0.5">
    {contact.categories.slice(0, 3).map((cat: ContactCategory) => (
      <span
        key={cat.id}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
        style={{
          backgroundColor: cat.color + "20",
          color: cat.color,
        }}
      >
        {cat.name}
      </span>
    ))}
    {contact.categories.length > 3 && (
      <span className="text-[10px] text-muted-foreground">
        +{contact.categories.length - 3}
      </span>
    )}
  </div>
)}
```

**Step 5: Add the new Contact fields to the create dialog form**

Add `category_ids` multi-select and the new address fields (city, postal_code, country) to the contact creation dialog.

**Step 6: Commit**

```bash
git add frontend/app/\(app\)/contacts/page.tsx frontend/components/contacts/ContactTable.tsx
git commit -m "feat(contacts): add category tabs, filtering, and badges to contacts list"
```

---

## Task 11: Frontend — Contact detail page redesign (left panel)

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Restructure to 2-column layout**

Replace the existing layout with a flex container:

```tsx
<div className="flex gap-6 p-6 h-full">
  {/* Left panel - Contact info */}
  <div className="w-[340px] shrink-0 overflow-y-auto space-y-6">
    {/* Content sections */}
  </div>

  {/* Right panel - Tabs */}
  <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
    {/* Tab content */}
  </div>
</div>
```

**Step 2: Build left panel header**

```tsx
{/* Avatar + Name */}
<div className="text-center space-y-3">
  <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold mx-auto">
    {contact.first_name[0]}{contact.last_name[0]}
  </div>
  <div>
    <h1 className="text-lg font-semibold">
      {contact.first_name} {contact.last_name}
    </h1>
    {(contact.job_title || contact.company) && (
      <p className="text-sm text-muted-foreground">
        {contact.job_title}{contact.job_title && contact.company ? " @ " : ""}{contact.company}
      </p>
    )}
  </div>
</div>

{/* Action buttons */}
<div className="flex items-center justify-center gap-2">
  {contact.email && (
    <Button variant="outline" size="sm" onClick={handleEmail}>
      <Mail className="h-4 w-4 mr-1" /> Email
    </Button>
  )}
  {contact.phone && (
    <Button variant="outline" size="sm" asChild>
      <a href={`tel:${contact.phone}`}>
        <Phone className="h-4 w-4 mr-1" /> Appeler
      </a>
    </Button>
  )}
  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
    <Pencil className="h-4 w-4" />
  </Button>
  <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive">
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

**Step 3: Build left panel info sections**

Each section follows this pattern:

```tsx
<div className="rounded-xl border border-border bg-card p-4 space-y-3">
  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
    Coordonnées
  </h3>
  <div className="space-y-2">
    {contact.email && (
      <div className="flex items-center gap-2 text-sm">
        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <a href={`mailto:${contact.email}`} className="hover:underline truncate">{contact.email}</a>
      </div>
    )}
    {/* More fields... */}
  </div>
</div>
```

Sections to build:
1. **Coordonnées** — email(s), phone(s), mobile, address (city, postal_code, country, state), linkedin, website, twitter
2. **Catégories** — color badges with [+ Ajouter] popover to select from available categories
3. **Qualification** — lead_score badge, estimated_budget, decision_role, identified_needs
4. **Champs personnalisés** — dynamic rendering based on CustomFieldDefinition fetched from API
5. **Résumé IA** — ai_summary with Sparkles icon and timestamp

**Step 4: Add category management on contact**

For the categories section, add a popover that lists available categories with checkboxes to toggle:

```tsx
const [availableCategories, setAvailableCategories] = useState<ContactCategory[]>([])

// Fetch available categories on mount
useEffect(() => {
  apiFetch<ContactCategory[]>("/contacts/categories/").then(setAvailableCategories)
}, [])

const toggleCategory = async (categoryId: string) => {
  const currentIds = contact.categories.map((c: ContactCategory) => c.id)
  const newIds = currentIds.includes(categoryId)
    ? currentIds.filter((id: string) => id !== categoryId)
    : [...currentIds, categoryId]

  try {
    await apiFetch(`/contacts/${contact.id}/`, {
      method: "PATCH",
      json: { category_ids: newIds },
    })
    fetchContact() // refresh
  } catch (err) {
    console.error("Failed to update categories:", err)
  }
}
```

**Step 5: Add custom fields display**

Fetch custom field definitions and render the contact's custom_fields values:

```tsx
const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([])

useEffect(() => {
  apiFetch<CustomFieldDefinition[]>("/contacts/custom-fields/").then(setCustomFieldDefs)
}, [])

// In render:
{customFieldDefs.length > 0 && (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      Champs personnalisés
    </h3>
    <div className="space-y-2">
      {customFieldDefs.map((def) => {
        const value = contact.custom_fields?.[def.id]
        if (!value && !editing) return null
        return (
          <div key={def.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{def.label}</span>
            <span className="font-medium">{formatCustomFieldValue(def, value)}</span>
          </div>
        )
      })}
    </div>
  </div>
)}
```

**Step 6: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(contacts): redesign contact detail left panel with categories and custom fields"
```

---

## Task 12: Frontend — Contact detail page (right panel with tabs)

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Add tab state and tab navigation**

```typescript
const [activeTab, setActiveTab] = useState<"activities" | "notes" | "emails" | "tasks" | "deals" | "history">("activities")

const tabs = [
  { key: "activities", label: "Activités", icon: MessageCircle },
  { key: "notes", label: "Notes", icon: FileText },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "tasks", label: "Tâches", icon: Target },
  { key: "deals", label: "Deals", icon: Briefcase },
  { key: "history", label: "Historique", icon: Clock },
] as const
```

Tab bar UI:

```tsx
<div className="border-b border-border">
  <div className="flex gap-1 px-2">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key)}
        className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab.key
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <tab.icon className="h-3.5 w-3.5" />
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

**Step 2: Activities tab**

Reuse the existing timeline/interactions display. Fetch from `/api/timeline/?contact={id}&type=interactions`. Show the timeline with activity logging button.

**Step 3: Notes tab**

Fetch notes from `/api/timeline/?contact={id}&type=journal` or `/api/notes/?contact={id}`. Show list of notes with an input to add new ones.

**Step 4: Emails tab**

Fetch sent emails from `/api/email/sent/?contact={id}` (or filter timeline by email types). Display sent/received emails with subject, date, preview.

**Step 5: Tasks tab**

Fetch tasks from `/api/tasks/?contact={id}`. Reuse TaskList component pattern. Add "Créer une tâche" button opening TaskDialog.

**Step 6: Deals tab**

Fetch deals from `/api/deals/?contact={id}`. Show deal cards with stage, amount, probability. Link to deal detail.

**Step 7: History tab**

Fetch from `/api/timeline/?contact={id}&type=journal`. Show modification history entries (CONTACT_UPDATED, CONTACT_CREATED types).

**Step 8: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(contacts): add tabbed right panel with activities, notes, emails, tasks, deals, history"
```

---

## Task 13: Frontend — Edit mode for contact detail

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Implement inline editing for each section**

When `editing` is true, transform each info section into form inputs. Use same input styling as the rest of the app: `h-11 bg-secondary/30 border-border/60`.

Key form sections:
- **Identity**: first_name, last_name, company, job_title
- **Coordonnées**: email, secondary_email, phone, secondary_phone, mobile_phone, address, city, postal_code, state, country, linkedin_url, website, twitter_url
- **Qualification**: lead_score (select), estimated_budget (number), decision_role (select), identified_needs (textarea)
- **Preferences**: preferred_channel, timezone, language, birthday
- **Custom fields**: Dynamic form inputs based on field_type (text → Input, long_text → Textarea, number → Input type="number", date → Input type="date", select → select dropdown with options, email → Input type="email", phone → Input type="tel", url → Input type="url", checkbox → Checkbox)
- **Business**: siret, source, industry

**Step 2: Save handler**

```typescript
const handleSave = async () => {
  setSaving(true)
  try {
    await apiFetch(`/contacts/${contact.id}/`, {
      method: "PATCH",
      json: {
        ...editForm,
        category_ids: editForm.category_ids,
        custom_fields: editForm.custom_fields,
      },
    })
    setEditing(false)
    fetchContact()
  } catch (err) {
    console.error("Failed to save contact:", err)
  } finally {
    setSaving(false)
  }
}
```

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(contacts): add inline edit mode for all contact fields including custom fields"
```

---

## Task 14: Backend — Update Contact serializer and search for new fields

**Files:**
- Modify: `backend/contacts/views.py`

**Step 1: Update search_contacts to include new fields**

In the `search_contacts` view, add the new fields to the search query:

```python
    for word in q.split():
        qs = qs.filter(
            Q(first_name__icontains=word)
            | Q(last_name__icontains=word)
            | Q(company__icontains=word)
            | Q(email__icontains=word)
            | Q(city__icontains=word)
            | Q(siret__icontains=word)
        )
```

**Step 2: Add task and deal filtering by contact**

Verify that existing task/deal endpoints support `?contact={id}` filtering. If not, add:

In `backend/tasks/views.py` TaskViewSet.get_queryset():
```python
    contact_id = self.request.query_params.get("contact")
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
```

In `backend/deals/views.py` DealViewSet.get_queryset():
```python
    contact_id = self.request.query_params.get("contact")
    if contact_id:
        qs = qs.filter(contact_id=contact_id)
```

**Step 3: Commit**

```bash
git add backend/contacts/views.py backend/tasks/views.py backend/deals/views.py
git commit -m "feat(contacts): add new fields to search and contact filtering for tasks/deals"
```

---

## Task 15: Integration testing and polish

**Step 1: Test backend endpoints manually**

Run: `docker compose exec backend python manage.py shell`

Verify:
1. Categories CRUD works
2. Custom fields CRUD works
3. Contact creation with categories and custom_fields works
4. Contact filtering by category works
5. Chat tools work for categories and custom fields

**Step 2: Test frontend flows**

1. Go to Settings > Organization → verify categories and custom fields sections appear
2. Create/edit/delete a category
3. Create/edit/delete a custom field
4. Go to Contacts list → verify category tabs appear
5. Filter by category
6. Open a contact → verify new layout
7. Add/remove categories from contact detail
8. Edit custom field values
9. Verify all tabs show correct data
10. Test via chat: "Ajoute Jean Dupont en tant que Client VIP"

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix(contacts): polish and bug fixes from integration testing"
```
