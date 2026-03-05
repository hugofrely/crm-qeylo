import csv
import io
import json
import re
from datetime import datetime

from django.db import transaction

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contact, CustomFieldDefinition, DuplicateDetectionSettings
from .duplicates import _find_duplicates
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
    if not org:
        return Response({"detail": "No organization"}, status=status.HTTP_403_FORBIDDEN)

    dup_settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)

    existing_emails = {
        e.lower()
        for e in Contact.objects.filter(organization=org)
        .exclude(email="")
        .values_list("email", flat=True)
    }

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

        # Check duplicate by email (fast path)
        email = native_data.get("email", "")
        if email and email.lower() in existing_emails:
            skipped += 1
            continue

        # Check duplicate by fuzzy matching (if no email match)
        if dup_settings.enabled:
            row_data = {
                "first_name": native_data.get("first_name", ""),
                "last_name": native_data.get("last_name", ""),
                "email": email,
                "phone": native_data.get("phone", ""),
                "mobile_phone": native_data.get("mobile_phone", ""),
                "siret": native_data.get("siret", ""),
                "company": native_data.get("company", ""),
            }
            dups = _find_duplicates(org, row_data, dup_settings)
            if dups:
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
            existing_emails.add(email.lower())

    with transaction.atomic():
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
