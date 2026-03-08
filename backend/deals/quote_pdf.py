from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.translation import override as translation_override
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Quote


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quote_pdf(request, pk):
    try:
        from weasyprint import HTML
    except ImportError:
        return Response(
            {"detail": "WeasyPrint is not installed. Rebuild the container with updated requirements."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )

    try:
        quote = Quote.objects.select_related(
            "deal", "deal__contact", "organization"
        ).prefetch_related("lines", "lines__product").get(
            pk=pk, organization=request.organization
        )
    except Quote.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    lines = []
    for line in quote.lines.all():
        lines.append({
            "description": line.description,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "unit": line.get_unit_display(),
            "tax_rate": line.tax_rate,
            "discount_percent": line.discount_percent,
            "discount_amount": line.discount_amount,
            "line_ht": line.line_ht,
            "line_ttc": line.line_ttc,
        })

    context = {
        "quote": quote,
        "lines": lines,
        "org": quote.organization,
        "contact": quote.deal.contact,
        "deal": quote.deal,
        "subtotal_ht": quote.subtotal_ht,
        "total_discount": quote.total_discount,
        "total_ht": quote.total_ht,
        "total_tax": quote.total_tax,
        "total_ttc": quote.total_ttc,
    }

    lang = getattr(request.user, "preferred_language", "fr") or "fr"
    with translation_override(lang):
        html_string = render_to_string("deals/quote_pdf.html", context)
        pdf = HTML(string=html_string).write_pdf()

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="devis-{quote.number}.pdf"'
    return response
