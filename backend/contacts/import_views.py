import csv
import io

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contact
from notifications.helpers import create_notification

# Map common CSV column names to Contact fields
FIELD_ALIASES = {
    "first_name": ["first_name", "prénom", "prenom", "firstname"],
    "last_name": ["last_name", "nom", "lastname", "surname"],
    "email": ["email", "e-mail", "mail", "courriel"],
    "phone": ["phone", "téléphone", "telephone", "tel", "mobile"],
    "company": ["company", "entreprise", "société", "societe", "organization"],
    "source": ["source", "origine"],
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

    return Response({
        "headers": headers,
        "preview": rows,
        "suggested_mapping": mapping,
        "total_rows": total_rows,
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

    # Parse mapping (sent as JSON string)
    import json
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

    contacts_to_create = []
    skipped = 0
    errors = []

    for i, row in enumerate(reader):
        if i >= MAX_ROWS:
            break

        data = {}
        for csv_col, field in mapping.items():
            if csv_col in row:
                data[field] = row[csv_col].strip()

        # Require at least first_name
        if not data.get("first_name"):
            errors.append(f"Ligne {i + 2}: prénom manquant")
            continue

        # Check duplicate by email
        email = data.get("email", "")
        if email and email.lower() in {e.lower() for e in existing_emails}:
            skipped += 1
            continue

        contacts_to_create.append(
            Contact(
                organization=org,
                created_by=request.user,
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                email=email,
                phone=data.get("phone", ""),
                company=data.get("company", ""),
                source=data.get("source", "Import CSV"),
            )
        )
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
    })
