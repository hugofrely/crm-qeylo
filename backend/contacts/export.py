import csv
import io
from datetime import date

from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import Contact


LEAD_SCORE_LABELS = {
    "hot": "Chaud",
    "warm": "Tiede",
    "cold": "Froid",
}

CSV_COLUMNS = [
    "Prenom", "Nom", "Email", "Telephone", "Mobile", "Entreprise", "Poste",
    "Lead score", "Source", "Ville", "Code postal", "Pays", "Industrie",
    "Categories", "Date de creation",
]


def _rows(queryset):
    """Yield CSV rows for each contact."""
    # BOM for Excel UTF-8 detection
    yield "\ufeff"

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    yield buf.getvalue()

    for contact in queryset.iterator(chunk_size=500):
        buf = io.StringIO()
        writer = csv.writer(buf)
        categories = " ; ".join(
            contact.categories.values_list("name", flat=True)
        )
        writer.writerow([
            contact.first_name,
            contact.last_name,
            contact.email,
            contact.phone,
            contact.mobile_phone,
            contact.company,
            contact.job_title,
            LEAD_SCORE_LABELS.get(contact.lead_score, ""),
            contact.source,
            contact.city,
            contact.postal_code,
            contact.country,
            contact.industry,
            categories,
            contact.created_at.strftime("%Y-%m-%d"),
        ])
        yield buf.getvalue()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_contacts(request):
    qs = Contact.objects.filter(
        organization=request.organization
    ).prefetch_related("categories")

    # Filter by category
    category_id = request.query_params.get("category")
    if category_id:
        qs = qs.filter(categories__id=category_id).distinct()

    # Filter by segment (reuse segment rule engine)
    segment_id = request.query_params.get("segment")
    if segment_id:
        from segments.models import Segment
        try:
            segment = Segment.objects.get(
                id=segment_id, organization=request.organization
            )
            from segments.engine import evaluate_segment
            qs = evaluate_segment(segment, request.organization)
            qs = qs.prefetch_related("categories")
        except Segment.DoesNotExist:
            pass

    # Filter by search query
    q = request.query_params.get("q", "").strip()
    if q:
        from django.db.models import Q
        for word in q.split():
            qs = qs.filter(
                Q(first_name__icontains=word)
                | Q(last_name__icontains=word)
                | Q(company__icontains=word)
                | Q(email__icontains=word)
                | Q(city__icontains=word)
            )

    filename = f"contacts-export-{date.today().isoformat()}.csv"
    response = StreamingHttpResponse(_rows(qs), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
