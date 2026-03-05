# CSV Import — Full Field Mapping + Custom Fields — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the CSV import feature to support mapping to all ~30 native Contact fields + dynamic custom fields, with a searchable combobox UI.

**Architecture:** Backend extends FIELD_ALIASES, preview endpoint returns custom field definitions, import endpoint dynamically maps any native field + custom fields with soft validation. Frontend replaces `<select>` with a Popover+Command combobox grouped by sections.

**Tech Stack:** Django REST Framework (backend), Next.js + shadcn/ui Popover+Command + cmdk (frontend), radix-ui unified package

---

### Task 1: Backend — Extend FIELD_ALIASES and preview endpoint

**Files:**
- Modify: `backend/contacts/import_views.py:1-70`

**Step 1: Update `import_views.py` — extend FIELD_ALIASES and preview**

Replace the full content of `backend/contacts/import_views.py` with:

```python
import csv
import io
import json
import re
from datetime import datetime

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contact, CustomFieldDefinition
from notifications.helpers import create_notification

# Map common CSV column names to Contact fields
FIELD_ALIASES = {
    # Identité
    "first_name": ["first_name", "prénom", "prenom", "firstname"],
    "last_name": ["last_name", "nom", "lastname", "surname"],
    "email": ["email", "e-mail", "mail", "courriel"],
    "phone": ["phone", "téléphone", "telephone", "tel"],
    "mobile_phone": ["mobile_phone", "mobile", "portable"],
    "secondary_email": ["secondary_email", "email2", "email_secondaire"],
    "secondary_phone": ["secondary_phone", "tel2", "telephone2"],
    # Entreprise
    "company": ["company", "entreprise", "société", "societe", "organization"],
    "job_title": ["job_title", "poste", "position", "titre", "fonction"],
    "industry": ["industry", "secteur", "industrie"],
    "siret": ["siret"],
    # Localisation
    "address": ["address", "adresse"],
    "city": ["city", "ville"],
    "postal_code": ["postal_code", "code_postal", "cp", "zip"],
    "country": ["country", "pays"],
    "state": ["state", "région", "region"],
    # Qualification
    "lead_score": ["lead_score", "score"],
    "estimated_budget": ["estimated_budget", "budget"],
    "decision_role": ["decision_role", "rôle", "role"],
    "identified_needs": ["identified_needs", "besoins"],
    # Préférences
    "preferred_channel": ["preferred_channel", "canal"],
    "timezone": ["timezone", "fuseau"],
    "language": ["language", "langue"],
    "birthday": ["birthday", "anniversaire", "date_naissance"],
    # Réseaux
    "linkedin_url": ["linkedin_url", "linkedin"],
    "twitter_url": ["twitter_url", "twitter"],
    "website": ["website", "site_web", "site"],
    # Divers
    "notes": ["notes", "commentaires", "remarques"],
    "source": ["source", "origine"],
}

# Native fields that can be set via CSV import
NATIVE_FIELDS = {
    "first_name", "last_name", "email", "phone", "mobile_phone",
    "secondary_email", "secondary_phone", "company", "job_title",
    "industry", "siret", "address", "city", "postal_code", "country",
    "state", "lead_score", "estimated_budget", "decision_role",
    "identified_needs", "preferred_channel", "timezone", "language",
    "birthday", "linkedin_url", "twitter_url", "website", "notes", "source",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_ROWS = 1000


def _suggest_mapping(headers: list[str]) -> dict[str, str]:
    """Auto-detect column mapping based on header names."""
    mapping = {}
    headers_lower = [h.strip().lower() for h in headers]
    for field, aliases in FIELD_ALIASES.items():
        for i, header in enumerate(headers_lower):
            if header in aliases:
                mapping[headers[i]] = field
                break
    return mapping


def _validate_custom_field(value: str, field_def: dict) -> tuple:
    """Validate and convert a custom field value. Returns (converted_value, warning_or_none)."""
    field_type = field_def["field_type"]
    label = field_def["label"]

    if field_type in ("text", "long_text", "phone"):
        return value, None

    if field_type == "number":
        try:
            return float(value), None
        except (ValueError, TypeError):
            return None, f"valeur ignorée pour '{label}' (nombre invalide)"

    if field_type == "date":
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(value, fmt).date().isoformat(), None
            except ValueError:
                continue
        return None, f"valeur ignorée pour '{label}' (date invalide)"

    if field_type == "select":
        options = field_def.get("options", [])
        if value in options:
            return value, None
        # Case-insensitive match
        for opt in options:
            if opt.lower() == value.lower():
                return opt, None
        return None, f"valeur ignorée pour '{label}' (option inconnue: '{value}')"

    if field_type == "email":
        if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            return value, None
        return None, f"valeur ignorée pour '{label}' (email invalide)"

    if field_type == "url":
        if re.match(r"^https?://", value):
            return value, None
        return None, f"valeur ignorée pour '{label}' (URL invalide)"

    if field_type == "checkbox":
        return value.lower() in ("oui", "yes", "true", "1", "vrai"), None

    return value, None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def import_preview(request):
    """Upload CSV and return headers + preview rows + suggested mapping."""
    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
    if file.size > MAX_FILE_SIZE:
        return Response({"detail": "File too large (max 5MB)"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames or []
        rows = []
        for i, row in enumerate(reader):
            if i >= 5:
                break
            rows.append(row)
        total_rows = sum(1 for _ in csv.DictReader(io.StringIO(content)))
    except Exception:
        return Response({"detail": "Invalid CSV file"}, status=status.HTTP_400_BAD_REQUEST)

    mapping = _suggest_mapping(headers)

    custom_field_definitions = list(
        CustomFieldDefinition.objects.filter(organization=request.organization)
        .order_by("order")
        .values("id", "label", "field_type", "is_required", "options")
    )

    return Response({
        "headers": headers,
        "preview": rows,
        "suggested_mapping": mapping,
        "total_rows": total_rows,
        "custom_field_definitions": custom_field_definitions,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def import_contacts(request):
    """Import contacts from CSV with column mapping."""
    file = request.FILES.get("file")
    mapping_raw = request.data.get("mapping", "")

    if not file:
        return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        mapping = json.loads(mapping_raw) if isinstance(mapping_raw, str) else mapping_raw
    except (json.JSONDecodeError, TypeError):
        return Response({"detail": "Invalid mapping"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
    except Exception:
        return Response({"detail": "Invalid CSV file"}, status=status.HTTP_400_BAD_REQUEST)

    org = request.organization
    existing_emails = set(
        Contact.objects.filter(organization=org)
        .exclude(email="")
        .values_list("email", flat=True)
    )

    # Load custom field definitions for validation
    custom_field_ids = {
        str(cf["id"]): cf
        for cf in CustomFieldDefinition.objects.filter(organization=org).values(
            "id", "label", "field_type", "is_required", "options"
        )
    }

    contacts_to_create = []
    skipped = 0
    errors = []
    warnings = []

    for i, row in enumerate(reader):
        if i >= MAX_ROWS:
            break

        native_data = {}
        custom_data = {}

        for csv_col, field in mapping.items():
            if not field or csv_col not in row:
                continue
            value = row[csv_col].strip()
            if not value:
                continue

            if field.startswith("custom::"):
                cf_id = field.replace("custom::", "")
                cf_def = custom_field_ids.get(cf_id)
                if cf_def:
                    converted, warning = _validate_custom_field(value, cf_def)
                    if warning:
                        warnings.append(f"Ligne {i + 2}: {warning}")
                    if converted is not None:
                        custom_data[cf_id] = converted
            elif field in NATIVE_FIELDS:
                native_data[field] = value

        # Require at least first_name
        if not native_data.get("first_name"):
            errors.append(f"Ligne {i + 2}: prénom manquant")
            continue

        # Check duplicate by email
        email = native_data.get("email", "")
        if email and email.lower() in {e.lower() for e in existing_emails}:
            skipped += 1
            continue

        # Set default source if not mapped
        if "source" not in native_data:
            native_data["source"] = "Import CSV"

        contact = Contact(
            organization=org,
            created_by=request.user,
            **native_data,
        )
        if custom_data:
            contact.custom_fields = custom_data

        contacts_to_create.append(contact)
        if email:
            existing_emails.add(email)

    created = Contact.objects.bulk_create(contacts_to_create)

    # Notification
    create_notification(
        organization=org,
        recipient=request.user,
        type="import_complete",
        title="Import terminé",
        message=f"{len(created)} contacts créés, {skipped} doublons ignorés.",
        link="/contacts",
    )

    return Response({
        "created": len(created),
        "skipped": skipped,
        "errors": errors,
        "warnings": warnings,
    })
```

**Step 2: Run existing tests to verify nothing is broken**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test contacts.tests.CSVImportTests -v 2`
Expected: All 3 existing tests PASS

**Step 3: Commit**

```bash
git add backend/contacts/import_views.py
git commit -m "feat(import): extend CSV import to support all native fields + custom fields with soft validation"
```

---

### Task 2: Backend — Add tests for new import functionality

**Files:**
- Modify: `backend/contacts/tests.py` (add new test methods to `CSVImportTests`)

**Step 1: Add tests for extended field mapping and custom fields**

Append the following test methods to the `CSVImportTests` class in `backend/contacts/tests.py`:

```python
    def test_import_with_extended_fields(self):
        """Import CSV with job_title, city, country etc."""
        csv_content = "first_name,last_name,email,poste,ville,pays\nMarie,Dupont,marie@example.com,CEO,Paris,France"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "last_name": "last_name",
                    "email": "email",
                    "poste": "job_title",
                    "ville": "city",
                    "pays": "country",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        from contacts.models import Contact
        contact = Contact.objects.get(email="marie@example.com")
        self.assertEqual(contact.job_title, "CEO")
        self.assertEqual(contact.city, "Paris")
        self.assertEqual(contact.country, "France")

    def test_import_with_custom_fields(self):
        """Import CSV with custom field mapping."""
        from contacts.models import Contact, CustomFieldDefinition
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        cf = CustomFieldDefinition.objects.create(
            organization=org,
            label="Secteur activité",
            field_type="text",
        )

        csv_content = "first_name,secteur\nMarie,Tech"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "secteur": f"custom::{cf.id}",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        contact = Contact.objects.get(first_name="Marie")
        self.assertEqual(contact.custom_fields[str(cf.id)], "Tech")

    def test_import_custom_field_soft_validation(self):
        """Invalid custom field values produce warnings, not errors."""
        from contacts.models import CustomFieldDefinition
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        cf = CustomFieldDefinition.objects.create(
            organization=org,
            label="Budget",
            field_type="number",
        )

        csv_content = "first_name,budget\nMarie,not_a_number"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "budget": f"custom::{cf.id}",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        self.assertTrue(len(response.data["warnings"]) > 0)
        self.assertIn("nombre invalide", response.data["warnings"][0])

    def test_preview_returns_custom_field_definitions(self):
        """Preview endpoint returns custom field definitions."""
        from contacts.models import CustomFieldDefinition
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        CustomFieldDefinition.objects.create(
            organization=org,
            label="NDA signé",
            field_type="checkbox",
        )

        csv_content = "first_name,email\nMarie,marie@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/preview/",
            {"file": f},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("custom_field_definitions", response.data)
        self.assertEqual(len(response.data["custom_field_definitions"]), 1)
        self.assertEqual(response.data["custom_field_definitions"][0]["label"], "NDA signé")

    def test_preview_extended_aliases(self):
        """Auto-detection works for extended aliases like 'poste' -> job_title."""
        csv_content = "prénom,poste,ville\nMarie,CEO,Paris"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/preview/",
            {"file": f},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["suggested_mapping"]["prénom"], "first_name")
        self.assertEqual(response.data["suggested_mapping"]["poste"], "job_title")
        self.assertEqual(response.data["suggested_mapping"]["ville"], "city")
```

Note: Add `import json` at the top of `backend/contacts/tests.py` if not already present.

**Step 2: Run all CSV import tests**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test contacts.tests.CSVImportTests -v 2`
Expected: All 8 tests PASS (3 existing + 5 new)

**Step 3: Commit**

```bash
git add backend/contacts/tests.py
git commit -m "test(import): add tests for extended field mapping and custom fields"
```

---

### Task 3: Frontend — Install cmdk and add Popover + Command components

**Files:**
- Create: `frontend/components/ui/popover.tsx`
- Create: `frontend/components/ui/command.tsx`

**Step 1: Install cmdk**

Run: `cd /Users/hugofrely/dev/crm-qeylo/frontend && npm install cmdk@1.1.1`

**Step 2: Create popover.tsx**

Create `frontend/components/ui/popover.tsx` using shadcn's Popover component adapted for the `radix-ui` unified package (the project uses `radix-ui` v1.4.3, not individual `@radix-ui/*` packages):

```tsx
"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
```

**Step 3: Create command.tsx**

Create `frontend/components/ui/command.tsx`:

```tsx
"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className
      )}
      {...props}
    />
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center border-b px-3" data-slot="command-input-wrapper">
      <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground [&_[data-slot=command-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group-heading]]:font-medium",
        className
      )}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
}
```

**Step 4: Commit**

```bash
git add frontend/components/ui/popover.tsx frontend/components/ui/command.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): add Popover and Command components (shadcn + cmdk)"
```

---

### Task 4: Frontend — Rewrite ImportCSVDialog with combobox mapping

**Files:**
- Modify: `frontend/components/contacts/ImportCSVDialog.tsx`

**Step 1: Rewrite ImportCSVDialog.tsx**

Replace the full content of `frontend/components/contacts/ImportCSVDialog.tsx`:

```tsx
"use client"

import { useState, useRef, useMemo } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle, ChevronsUpDown, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface FieldOption {
  value: string
  label: string
}

interface FieldGroup {
  label: string
  fields: FieldOption[]
}

const NATIVE_FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Identité",
    fields: [
      { value: "first_name", label: "Prénom" },
      { value: "last_name", label: "Nom" },
      { value: "email", label: "Email" },
      { value: "phone", label: "Téléphone" },
      { value: "mobile_phone", label: "Mobile" },
      { value: "secondary_email", label: "Email secondaire" },
      { value: "secondary_phone", label: "Tél. secondaire" },
    ],
  },
  {
    label: "Entreprise",
    fields: [
      { value: "company", label: "Entreprise" },
      { value: "job_title", label: "Poste" },
      { value: "industry", label: "Secteur" },
      { value: "siret", label: "SIRET" },
    ],
  },
  {
    label: "Localisation",
    fields: [
      { value: "address", label: "Adresse" },
      { value: "city", label: "Ville" },
      { value: "postal_code", label: "Code postal" },
      { value: "country", label: "Pays" },
      { value: "state", label: "Région" },
    ],
  },
  {
    label: "Qualification",
    fields: [
      { value: "lead_score", label: "Score lead" },
      { value: "estimated_budget", label: "Budget estimé" },
      { value: "decision_role", label: "Rôle décision" },
      { value: "identified_needs", label: "Besoins identifiés" },
    ],
  },
  {
    label: "Préférences",
    fields: [
      { value: "preferred_channel", label: "Canal préféré" },
      { value: "timezone", label: "Fuseau horaire" },
      { value: "language", label: "Langue" },
      { value: "birthday", label: "Anniversaire" },
    ],
  },
  {
    label: "Réseaux",
    fields: [
      { value: "linkedin_url", label: "LinkedIn" },
      { value: "twitter_url", label: "Twitter" },
      { value: "website", label: "Site web" },
    ],
  },
  {
    label: "Divers",
    fields: [
      { value: "notes", label: "Notes" },
      { value: "source", label: "Source" },
    ],
  },
]

interface CustomFieldDef {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
}

interface PreviewData {
  headers: string[]
  preview: Record<string, string>[]
  suggested_mapping: Record<string, string>
  total_rows: number
  custom_field_definitions: CustomFieldDef[]
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
  warnings: string[]
}

function FieldMappingCombobox({
  value,
  onChange,
  groups,
  usedValues,
}: {
  value: string
  onChange: (value: string) => void
  groups: FieldGroup[]
  usedValues: Set<string>
}) {
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(() => {
    if (!value) return "— Ignorer —"
    for (const group of groups) {
      const field = group.fields.find((f) => f.value === value)
      if (field) return field.label
    }
    return value
  }, [value, groups])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between bg-secondary/30 font-normal"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un champ..." />
          <CommandList>
            <CommandEmpty>Aucun champ trouvé.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__ignore__"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                — Ignorer —
              </CommandItem>
            </CommandGroup>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.fields.map((field) => {
                  const isUsed = usedValues.has(field.value) && field.value !== value
                  return (
                    <CommandItem
                      key={field.value}
                      value={field.value}
                      keywords={[field.label]}
                      disabled={isUsed}
                      onSelect={() => {
                        onChange(field.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === field.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {field.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ImportCSVDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep(1)
    setFile(null)
    setPreview(null)
    setMapping({})
    setResult(null)
  }

  const handleFileSelect = async (f: File) => {
    setFile(f)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/contacts/import/preview/`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}`,
          },
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error")
      setPreview(data)
      setMapping(data.suggested_mapping)
      setStep(2)
    } catch (err) {
      console.error("Preview failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mapping", JSON.stringify(mapping))
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/contacts/import/`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}`,
          },
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Error")
      setResult(data)
      setStep(3)
      onImported()
    } catch (err) {
      console.error("Import failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const fieldGroups = useMemo<FieldGroup[]>(() => {
    const groups = [...NATIVE_FIELD_GROUPS]
    if (preview?.custom_field_definitions?.length) {
      groups.push({
        label: "Champs personnalisés",
        fields: preview.custom_field_definitions.map((cf) => ({
          value: `custom::${cf.id}`,
          label: cf.label,
        })),
      })
    }
    return groups
  }, [preview?.custom_field_definitions])

  const usedValues = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping]
  )

  const mappedFields = Object.values(mapping).filter(Boolean)
  const hasMandatoryField = mappedFields.includes("first_name")

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Importer des contacts
            {step < 3 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground font-[family-name:var(--font-body)]">
                Étape {step}/3
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFileSelect(f)
              }}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-14 cursor-pointer hover:border-primary/30 hover:bg-secondary/30 transition-all"
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/8 text-primary">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium font-[family-name:var(--font-body)]">
                      Glissez votre fichier CSV ici
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                      ou cliquez pour sélectionner · Max 5 MB
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
              }}
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && preview && (
          <div className="space-y-4 min-w-0 overflow-hidden font-[family-name:var(--font-body)]">
            <p className="text-sm text-muted-foreground">
              {preview.total_rows} lignes détectées. Associez les colonnes aux champs contact.
            </p>

            <div className="space-y-2">
              {preview.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium">
                    {header}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <FieldMappingCombobox
                    value={mapping[header] || ""}
                    onChange={(value) =>
                      setMapping({ ...mapping, [header]: value })
                    }
                    groups={fieldGroups}
                    usedValues={usedValues}
                  />
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-secondary/30">
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-muted-foreground">
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!hasMandatoryField && (
              <p className="text-xs text-destructive">
                Le champ « Prénom » est obligatoire.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button
                onClick={handleImport}
                disabled={!hasMandatoryField || loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importer {preview.total_rows} contacts
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="space-y-5 text-center py-6 font-[family-name:var(--font-body)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="text-2xl font-light">
                {result.created} contacts importés
              </p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {result.skipped} doublons ignorés
                </p>
              )}
              {result.errors.length > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {result.errors.length} erreurs
                </p>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-3 text-left mx-auto max-w-md">
                  <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{result.warnings.length} avertissements</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button onClick={() => { setOpen(false); reset() }}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Verify frontend builds**

Run: `cd /Users/hugofrely/dev/crm-qeylo/frontend && npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add frontend/components/contacts/ImportCSVDialog.tsx
git commit -m "feat(import): rewrite CSV import dialog with combobox mapping for all fields + custom fields"
```

---

### Task 5: Final verification

**Step 1: Run all backend tests**

Run: `cd /Users/hugofrely/dev/crm-qeylo/backend && python manage.py test contacts -v 2`
Expected: All tests PASS

**Step 2: Run frontend build**

Run: `cd /Users/hugofrely/dev/crm-qeylo/frontend && npm run build`
Expected: Build succeeds

**Step 3: Final commit (if any fixups needed)**

Only if fixes were required during verification.
