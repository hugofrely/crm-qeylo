import uuid
import os
import boto3
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_image(request):
    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

    if file.content_type not in ALLOWED_TYPES:
        return Response(
            {"detail": f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_TYPES)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file.size > MAX_SIZE:
        return Response({"detail": "File too large (max 5MB)."}, status=status.HTTP_400_BAD_REQUEST)

    ext = os.path.splitext(file.name)[1].lower() or ".png"
    key = f"notes/{uuid.uuid4()}{ext}"

    client = _get_s3_client()
    client.upload_fileobj(
        file,
        settings.R2_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": file.content_type},
    )

    url = f"{settings.R2_PUBLIC_URL}/{key}"
    return Response({"url": url}, status=status.HTTP_201_CREATED)
