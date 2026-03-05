from django.contrib.postgres.search import TrigramSimilarity
from django.db import transaction
from django.db.models import Q, Value
from django.db.models.functions import Concat

from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from deals.models import Deal
from notes.models import TimelineEntry
from tasks.models import Task

from .models import Contact, DuplicateDetectionSettings
from .serializers import ContactSerializer, DuplicateDetectionSettingsSerializer


def _find_duplicates(organization, data, settings):
    """Return list of (contact, score, matched_on) tuples."""
    if not settings.enabled:
        return []

    contacts = Contact.objects.filter(organization=organization)
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    mobile_phone = data.get("mobile_phone", "").strip()
    company = data.get("company", "").strip()
    siret = data.get("siret", "").strip()

    results = {}  # contact_id -> (contact, score, matched_on)

    # Email exact match
    if settings.match_email and email:
        email_matches = contacts.filter(
            Q(email__iexact=email) | Q(secondary_email__iexact=email)
        )
        for c in email_matches:
            results[c.id] = (c, 0.9, ["email"])

    # Phone exact match
    if settings.match_phone and (phone or mobile_phone):
        phone_q = Q()
        for p in [phone, mobile_phone]:
            if p:
                phone_q |= Q(phone=p) | Q(mobile_phone=p) | Q(secondary_phone=p)
        phone_matches = contacts.filter(phone_q)
        for c in phone_matches:
            if c.id in results:
                existing = results[c.id]
                results[c.id] = (c, max(existing[1], 0.7), existing[2] + ["phone"])
            else:
                results[c.id] = (c, 0.7, ["phone"])

    # SIRET exact match
    if settings.match_siret and siret:
        siret_matches = contacts.filter(siret=siret).exclude(siret="")
        for c in siret_matches:
            if c.id in results:
                existing = results[c.id]
                results[c.id] = (c, max(existing[1], 0.8), existing[2] + ["siret"])
            else:
                results[c.id] = (c, 0.8, ["siret"])

    # Name fuzzy match (trigram similarity on PostgreSQL, icontains fallback on SQLite)
    if settings.match_name and first_name and last_name:
        full_name = f"{first_name} {last_name}"
        try:
            name_matches = (
                contacts.annotate(
                    name_similarity=TrigramSimilarity(
                        Concat("first_name", Value(" "), "last_name"),
                        full_name,
                    )
                )
                .filter(name_similarity__gte=settings.similarity_threshold)
                .order_by("-name_similarity")[:10]
            )
            for c in name_matches:
                score = float(c.name_similarity)
                if c.id in results:
                    existing = results[c.id]
                    results[c.id] = (c, max(existing[1], score), existing[2] + ["name"])
                else:
                    results[c.id] = (c, score, ["name"])
        except Exception:
            # SQLite fallback: use icontains
            name_matches = contacts.filter(
                Q(first_name__icontains=first_name) & Q(last_name__icontains=last_name)
            )
            for c in name_matches:
                score = 0.8  # High score for exact-ish match
                if c.id in results:
                    existing = results[c.id]
                    results[c.id] = (c, max(existing[1], score), existing[2] + ["name"])
                else:
                    results[c.id] = (c, score, ["name"])

    # Company fuzzy bonus
    if settings.match_company and company:
        try:
            company_matches = (
                contacts.annotate(
                    company_similarity=TrigramSimilarity("company", company)
                )
                .filter(company_similarity__gte=0.5)
            )
            for c in company_matches:
                if c.id in results:
                    existing = results[c.id]
                    new_score = min(existing[1] + 0.1, 1.0)
                    matched = existing[2] if "company" in existing[2] else existing[2] + ["company"]
                    results[c.id] = (c, new_score, matched)
        except Exception:
            pass

    # Filter by threshold and sort
    final = [
        (c, score, matched_on)
        for c, score, matched_on in results.values()
        if score >= 0.5
    ]
    final.sort(key=lambda x: x[1], reverse=True)
    return final[:5]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_duplicates(request):
    """Check for potential duplicate contacts before creation."""
    org = request.organization
    settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)

    duplicates = _find_duplicates(org, request.data, settings)

    return Response({
        "duplicates": [
            {
                "contact": ContactSerializer(contact).data,
                "score": round(score, 2),
                "matched_on": matched_on,
            }
            for contact, score, matched_on in duplicates
        ]
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def merge_contacts(request, pk):
    """Merge a duplicate contact into the primary contact."""
    org = request.organization
    try:
        primary = Contact.objects.get(id=pk, organization=org)
    except Contact.DoesNotExist:
        return Response({"detail": "Contact principal introuvable."}, status=http_status.HTTP_404_NOT_FOUND)

    duplicate_id = request.data.get("duplicate_id")
    try:
        duplicate = Contact.objects.get(id=duplicate_id, organization=org)
    except Contact.DoesNotExist:
        return Response({"detail": "Contact doublon introuvable."}, status=http_status.HTTP_404_NOT_FOUND)

    field_overrides = request.data.get("field_overrides", {})

    with transaction.atomic():
        # Apply field overrides
        for field, value in field_overrides.items():
            if hasattr(primary, field) and field not in ("id", "organization", "created_by", "created_at", "updated_at"):
                setattr(primary, field, value)

        # Merge tags (union)
        primary.tags = list(set(primary.tags + duplicate.tags))

        # Merge interests (union)
        primary.interests = list(set(primary.interests + duplicate.interests))

        # Merge custom_fields (fill gaps)
        for key, value in duplicate.custom_fields.items():
            if key not in primary.custom_fields or not primary.custom_fields[key]:
                primary.custom_fields[key] = value

        primary.save()

        # Transfer categories (union)
        for cat in duplicate.categories.all():
            primary.categories.add(cat)

        # Transfer linked data
        Deal.objects.filter(contact=duplicate).update(contact=primary)
        Task.objects.filter(contact=duplicate).update(contact=primary)
        TimelineEntry.objects.filter(contact=duplicate).update(contact=primary)

        # Create merge timeline entry
        TimelineEntry.objects.create(
            organization=org,
            created_by=request.user,
            contact=primary,
            entry_type=TimelineEntry.EntryType.CONTACT_MERGED,
            content=f"Contact fusionné avec {duplicate.first_name} {duplicate.last_name}",
            metadata={
                "merged_contact_name": f"{duplicate.first_name} {duplicate.last_name}",
                "merged_contact_email": duplicate.email,
            },
        )

        # Delete duplicate
        duplicate.delete()

    # Refresh and return
    primary.refresh_from_db()
    return Response(ContactSerializer(primary).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def duplicate_settings(request):
    """Get or update duplicate detection settings for the organization."""
    settings, _ = DuplicateDetectionSettings.objects.get_or_create(
        organization=request.organization
    )
    if request.method == "GET":
        return Response(DuplicateDetectionSettingsSerializer(settings).data)

    serializer = DuplicateDetectionSettingsSerializer(settings, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
