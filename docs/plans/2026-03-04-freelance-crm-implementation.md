# FreelanceCRM (Qeylo) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a conversational CRM for freelancers where the primary interface is an AI chat that creates/manages contacts, deals, tasks automatically from natural language.

**Architecture:** Monorepo with Next.js frontend and Django backend communicating via REST API (DRF). Pydantic AI handles the conversational chat with tool calling. PostgreSQL for storage. All containerized with Docker Compose and hot-reload for dev.

**Tech Stack:** Next.js 15 (App Router), Django 5, DRF, Pydantic AI, PostgreSQL 16, shadcn/ui, Tailwind CSS, Docker Compose, simplejwt

**Design doc:** `docs/plans/2026-03-04-freelance-crm-design.md`

---

## Task 1: Project Scaffolding & Docker Compose

Set up the monorepo structure with Docker Compose, both Dockerfiles, and verify everything boots.

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `backend/Dockerfile.dev`
- Create: `backend/requirements.txt`
- Create: `backend/manage.py`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `frontend/Dockerfile.dev`
- Create: `frontend/package.json`

**Step 1: Create .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
*.sqlite3

# Node
node_modules/
.next/
out/

# Environment
.env
.env.local

# Docker
postgres_data/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
```

**Step 2: Create .env.example**

```env
# Django
DJANGO_SECRET_KEY=change-me-in-production
DEBUG=true

# Database
POSTGRES_DB=crm_qeylo
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=crm_pass
DATABASE_URL=postgresql://crm_user:crm_pass@db:5432/crm_qeylo

# AI
AI_MODEL=claude-sonnet-4-20250514
AI_FALLBACK_MODEL=openai:gpt-4o
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Step 3: Create backend/requirements.txt**

```txt
django==5.1.*
djangorestframework==3.15.*
djangorestframework-simplejwt==5.4.*
django-cors-headers==4.6.*
psycopg[binary]==3.2.*
dj-database-url==2.3.*
pydantic-ai==0.2.*
anthropic==0.43.*
openai==1.60.*
```

**Step 4: Initialize Django project**

```bash
cd backend
pip install django==5.1.*
django-admin startproject config .
```

Then replace the generated `config/settings.py` with our custom version (see Step 5).

**Step 5: Create backend/config/settings.py**

```python
import os
from pathlib import Path
from datetime import timedelta

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    # Local apps
    "accounts",
    "organizations",
    "contacts",
    "deals",
    "tasks",
    "notes",
    "chat",
    "dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default="postgresql://crm_user:crm_pass@db:5432/crm_qeylo"
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# AI
AI_MODEL = os.environ.get("AI_MODEL", "claude-sonnet-4-20250514")
AI_FALLBACK_MODEL = os.environ.get("AI_FALLBACK_MODEL", "openai:gpt-4o")
```

**Step 6: Create backend/config/urls.py**

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/organizations/", include("organizations.urls")),
    path("api/contacts/", include("contacts.urls")),
    path("api/deals/", include("deals.urls")),
    path("api/pipeline-stages/", include("deals.stage_urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/timeline/", include("notes.urls")),
    path("api/notes/", include("notes.note_urls")),
    path("api/chat/", include("chat.urls")),
    path("api/dashboard/", include("dashboard.urls")),
]
```

**Step 7: Create all Django app stubs**

For each app (`accounts`, `organizations`, `contacts`, `deals`, `tasks`, `notes`, `chat`, `dashboard`), create:
- `backend/<app>/__init__.py` (empty)
- `backend/<app>/models.py` (empty — `from django.db import models`)
- `backend/<app>/urls.py` (empty — `urlpatterns = []`)
- `backend/<app>/views.py` (empty)
- `backend/<app>/serializers.py` (empty)
- `backend/<app>/admin.py` (empty — `from django.contrib import admin`)
- `backend/<app>/apps.py` (standard AppConfig)

For `deals`, also create `backend/deals/stage_urls.py` with `urlpatterns = []`.
For `notes`, also create `backend/notes/note_urls.py` with `urlpatterns = []`.

**Step 8: Create backend/Dockerfile.dev**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

**Step 9: Initialize Next.js frontend**

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

**Step 10: Create frontend/Dockerfile.dev**

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

**Step 11: Create docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-crm_qeylo}
      POSTGRES_USER: ${POSTGRES_USER:-crm_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-crm_pass}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user -d crm_qeylo"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-crm_user}:${POSTGRES_PASSWORD:-crm_pass}@db:5432/${POSTGRES_DB:-crm_qeylo}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    env_file:
      - .env
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api
      WATCHPACK_POLLING: "true"
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Step 12: Boot and verify**

```bash
cp .env.example .env
docker compose up --build
```

Expected: All 3 services start. Frontend at http://localhost:3000 shows Next.js default page. Backend at http://localhost:8000 shows Django debug page (or DRF browsable API root).

**Step 13: Run Django migrations**

```bash
docker compose exec backend python manage.py migrate
```

Expected: Default Django tables created.

**Step 14: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with Docker Compose, Django, and Next.js"
```

---

## Task 2: User Model & Auth (accounts app)

Custom User model with email as username, JWT auth endpoints.

**Files:**
- Create: `backend/accounts/models.py`
- Create: `backend/accounts/serializers.py`
- Create: `backend/accounts/views.py`
- Create: `backend/accounts/urls.py`
- Create: `backend/accounts/tests.py`

**Step 1: Write failing tests for auth**

```python
# backend/accounts/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_org(self):
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "hugo@example.com")

    def test_register_duplicate_email_fails(self):
        self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "anotherpass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        response = self.client.post("/api/auth/login/", {
            "email": "hugo@example.com",
            "password": "securepass123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password_fails(self):
        self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        response = self.client.post("/api/auth/login/", {
            "email": "hugo@example.com",
            "password": "wrongpass",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_user(self):
        reg = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {reg.data['access']}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "hugo@example.com")

    def test_me_endpoint_unauthenticated_fails(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

**Step 2: Run tests to verify they fail**

```bash
docker compose exec backend python manage.py test accounts -v 2
```

Expected: FAIL — models don't exist yet.

**Step 3: Create User model**

```python
# backend/accounts/models.py
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = None  # Remove username field

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    def __str__(self):
        return self.email
```

**Step 4: Create serializers**

```python
# backend/accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "date_joined"]
        read_only_fields = fields
```

**Step 5: Create views**

```python
# backend/accounts/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .serializers import RegisterSerializer, UserSerializer
from organizations.models import Organization, Membership

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.validate_or_raise(request.data)
    # Above line won't work — use is_valid pattern:
    pass


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = User.objects.create_user(
        email=data["email"],
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
    )

    # Create personal organization
    org = Organization.objects.create(
        name=f"{user.first_name}'s Workspace",
        slug=f"user-{user.id.hex[:8]}",
    )
    Membership.objects.create(
        organization=org,
        user=user,
        role="owner",
    )

    refresh = RefreshToken.for_user(user)
    return Response({
        "user": UserSerializer(user).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")
    user = authenticate(request, email=email, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    refresh = RefreshToken.for_user(user)
    return Response({
        "user": UserSerializer(user).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)
```

**Step 6: Create urls**

```python
# backend/accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("refresh/", TokenRefreshView.as_view()),
    path("me/", views.me),
]
```

**Step 7: Make migrations and migrate**

```bash
docker compose exec backend python manage.py makemigrations accounts
docker compose exec backend python manage.py migrate
```

**Step 8: Run tests and verify they pass**

```bash
docker compose exec backend python manage.py test accounts -v 2
```

Expected: All 6 tests PASS. (Note: Organization model is needed — see Task 3. If running Task 2 first, temporarily stub the Organization creation or implement Task 3 concurrently.)

**Step 9: Commit**

```bash
git add backend/accounts/
git commit -m "feat: custom User model with email auth and JWT endpoints"
```

---

## Task 3: Organization & Membership (organizations app)

Multi-tenant support with auto-created personal org on registration.

**Files:**
- Create: `backend/organizations/models.py`
- Create: `backend/organizations/serializers.py`
- Create: `backend/organizations/views.py`
- Create: `backend/organizations/urls.py`
- Create: `backend/organizations/tests.py`
- Create: `backend/organizations/middleware.py`

**Step 1: Write failing tests**

```python
# backend/organizations/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from organizations.models import Organization, Membership


class OrganizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Register creates user + org
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.user = User.objects.get(email="hugo@example.com")

    def test_personal_org_created_on_register(self):
        memberships = Membership.objects.filter(user=self.user)
        self.assertEqual(memberships.count(), 1)
        self.assertEqual(memberships.first().role, "owner")

    def test_list_organizations(self):
        response = self.client.get("/api/organizations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_organization(self):
        response = self.client.post("/api/organizations/", {
            "name": "Mon Agence",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Mon Agence")
        # User is owner of new org
        membership = Membership.objects.get(
            user=self.user,
            organization_id=response.data["id"],
        )
        self.assertEqual(membership.role, "owner")
```

**Step 2: Run tests to verify they fail**

```bash
docker compose exec backend python manage.py test organizations -v 2
```

**Step 3: Create Organization and Membership models**

```python
# backend/organizations/models.py
import uuid
from django.db import models
from django.conf import settings


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    siret = models.CharField(max_length=14, blank=True, default="")
    logo_url = models.URLField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Membership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "user")

    def __str__(self):
        return f"{self.user.email} @ {self.organization.name} ({self.role})"
```

**Step 4: Create org middleware (sets request.organization)**

```python
# backend/organizations/middleware.py
from organizations.models import Membership


class OrganizationMiddleware:
    """
    Sets request.organization based on the X-Organization header
    or defaults to the user's first org.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = None
        if hasattr(request, "user") and request.user.is_authenticated:
            org_id = request.headers.get("X-Organization")
            if org_id:
                membership = Membership.objects.filter(
                    user=request.user, organization_id=org_id
                ).select_related("organization").first()
                if membership:
                    request.organization = membership.organization
            if request.organization is None:
                membership = (
                    Membership.objects.filter(user=request.user)
                    .select_related("organization")
                    .first()
                )
                if membership:
                    request.organization = membership.organization
        return self.get_response(request)
```

Add to `config/settings.py` MIDDLEWARE list, after `AuthenticationMiddleware`:
```python
"organizations.middleware.OrganizationMiddleware",
```

**Step 5: Create serializers and views**

```python
# backend/organizations/serializers.py
from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "siret", "logo_url", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]
```

```python
# backend/organizations/views.py
import uuid
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.text import slugify

from .models import Organization, Membership
from .serializers import OrganizationSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def organization_list(request):
    if request.method == "GET":
        orgs = Organization.objects.filter(
            memberships__user=request.user
        )
        return Response(OrganizationSerializer(orgs, many=True).data)

    # POST
    serializer = OrganizationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    slug = slugify(serializer.validated_data["name"])
    if Organization.objects.filter(slug=slug).exists():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    org = Organization.objects.create(
        name=serializer.validated_data["name"],
        slug=slug,
    )
    Membership.objects.create(
        organization=org, user=request.user, role="owner"
    )
    return Response(
        OrganizationSerializer(org).data, status=status.HTTP_201_CREATED
    )
```

```python
# backend/organizations/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.organization_list),
]
```

**Step 6: Make migrations and migrate**

```bash
docker compose exec backend python manage.py makemigrations organizations
docker compose exec backend python manage.py migrate
```

**Step 7: Run tests**

```bash
docker compose exec backend python manage.py test organizations -v 2
```

Expected: All 3 tests PASS.

**Step 8: Commit**

```bash
git add backend/organizations/ backend/config/settings.py
git commit -m "feat: Organization and Membership models with multi-tenant middleware"
```

---

## Task 4: Contacts CRUD (contacts app)

Full CRUD for contacts, scoped to organization.

**Files:**
- Create: `backend/contacts/models.py`
- Create: `backend/contacts/serializers.py`
- Create: `backend/contacts/views.py`
- Create: `backend/contacts/urls.py`
- Create: `backend/contacts/tests.py`

**Step 1: Write failing tests**

```python
# backend/contacts/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ContactTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_contact(self):
        response = self.client.post("/api/contacts/", {
            "first_name": "Marie",
            "last_name": "Dupont",
            "company": "Decathlon",
            "email": "marie@decathlon.com",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["first_name"], "Marie")
        self.assertEqual(response.data["company"], "Decathlon")

    def test_list_contacts(self):
        self.client.post("/api/contacts/", {
            "first_name": "Marie", "last_name": "Dupont",
        })
        self.client.post("/api/contacts/", {
            "first_name": "Pierre", "last_name": "Martin",
        })
        response = self.client.get("/api/contacts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_update_contact(self):
        create = self.client.post("/api/contacts/", {
            "first_name": "Marie", "last_name": "Dupont",
        })
        contact_id = create.data["id"]
        response = self.client.patch(f"/api/contacts/{contact_id}/", {
            "company": "Nike",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"], "Nike")

    def test_delete_contact(self):
        create = self.client.post("/api/contacts/", {
            "first_name": "Marie", "last_name": "Dupont",
        })
        contact_id = create.data["id"]
        response = self.client.delete(f"/api/contacts/{contact_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_search_contacts(self):
        self.client.post("/api/contacts/", {
            "first_name": "Marie", "last_name": "Dupont", "company": "Decathlon",
        })
        self.client.post("/api/contacts/", {
            "first_name": "Pierre", "last_name": "Martin", "company": "Nike",
        })
        response = self.client.get("/api/contacts/search/?q=decathlon")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["first_name"], "Marie")

    def test_contacts_scoped_to_organization(self):
        """Another user cannot see my contacts."""
        self.client.post("/api/contacts/", {
            "first_name": "Marie", "last_name": "Dupont",
        })
        # Register another user
        client2 = APIClient()
        reg2 = client2.post("/api/auth/register/", {
            "email": "other@example.com",
            "password": "securepass123",
            "first_name": "Other",
            "last_name": "User",
        })
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {reg2.data['access']}")
        response = client2.get("/api/contacts/")
        self.assertEqual(response.data["count"], 0)
```

**Step 2: Run tests to verify they fail**

```bash
docker compose exec backend python manage.py test contacts -v 2
```

**Step 3: Create Contact model**

```python
# backend/contacts/models.py
import uuid
from django.db import models
from django.conf import settings


class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="contacts"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    company = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(max_length=100, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
```

**Step 4: Create serializers**

```python
# backend/contacts/serializers.py
from rest_framework import serializers
from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id", "first_name", "last_name", "email", "phone",
            "company", "source", "tags", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
```

**Step 5: Create views**

```python
# backend/contacts/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from .models import Contact
from .serializers import ContactSerializer


class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Contact.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_contacts(request):
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response([])
    contacts = Contact.objects.filter(
        organization=request.organization,
    ).filter(
        Q(first_name__icontains=q)
        | Q(last_name__icontains=q)
        | Q(company__icontains=q)
        | Q(email__icontains=q)
    )
    return Response(ContactSerializer(contacts, many=True).data)
```

**Step 6: Create urls**

```python
# backend/contacts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ContactViewSet, basename="contact")

urlpatterns = [
    path("search/", views.search_contacts),
    path("", include(router.urls)),
]
```

**Step 7: Make migrations and run tests**

```bash
docker compose exec backend python manage.py makemigrations contacts
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py test contacts -v 2
```

Expected: All 7 tests PASS.

**Step 8: Commit**

```bash
git add backend/contacts/
git commit -m "feat: contacts CRUD with org scoping and search"
```

---

## Task 5: Deals & Pipeline Stages (deals app)

Pipeline stages (customizable per org with defaults) and deals CRUD with pipeline view.

**Files:**
- Create: `backend/deals/models.py`
- Create: `backend/deals/serializers.py`
- Create: `backend/deals/views.py`
- Create: `backend/deals/urls.py`
- Create: `backend/deals/stage_urls.py`
- Create: `backend/deals/tests.py`

**Step 1: Write failing tests**

```python
# backend/deals/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from deals.models import PipelineStage


class DealTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_default_pipeline_stages_created(self):
        response = self.client.get("/api/pipeline-stages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 6)
        stage_names = [s["name"] for s in response.data]
        self.assertIn("Premier contact", stage_names)
        self.assertIn("Gagné", stage_names)

    def test_create_deal(self):
        stages = self.client.get("/api/pipeline-stages/").data
        first_stage_id = stages[0]["id"]
        response = self.client.post("/api/deals/", {
            "name": "Site e-commerce",
            "amount": "15000.00",
            "stage": first_stage_id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Site e-commerce")

    def test_pipeline_view(self):
        stages = self.client.get("/api/pipeline-stages/").data
        first_stage_id = stages[0]["id"]
        self.client.post("/api/deals/", {
            "name": "Deal 1", "amount": "5000.00", "stage": first_stage_id,
        })
        self.client.post("/api/deals/", {
            "name": "Deal 2", "amount": "10000.00", "stage": first_stage_id,
        })
        response = self.client.get("/api/deals/pipeline/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Returns stages with their deals
        self.assertTrue(len(response.data) > 0)

    def test_move_deal_to_stage(self):
        stages = self.client.get("/api/pipeline-stages/").data
        first_stage_id = stages[0]["id"]
        second_stage_id = stages[1]["id"]
        create = self.client.post("/api/deals/", {
            "name": "Deal 1", "amount": "5000.00", "stage": first_stage_id,
        })
        deal_id = create.data["id"]
        response = self.client.patch(f"/api/deals/{deal_id}/", {
            "stage": second_stage_id,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stage"], second_stage_id)
```

**Step 2: Run tests to verify they fail**

```bash
docker compose exec backend python manage.py test deals -v 2
```

**Step 3: Create models**

```python
# backend/deals/models.py
import uuid
from django.db import models
from django.conf import settings

DEFAULT_STAGES = [
    {"name": "Premier contact", "color": "#6366F1", "order": 1},
    {"name": "En discussion", "color": "#F59E0B", "order": 2},
    {"name": "Devis envoyé", "color": "#3B82F6", "order": 3},
    {"name": "Négociation", "color": "#8B5CF6", "order": 4},
    {"name": "Gagné", "color": "#10B981", "order": 5},
    {"name": "Perdu", "color": "#EF4444", "order": 6},
]


class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="pipeline_stages"
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default="#6366F1")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name

    @classmethod
    def create_defaults(cls, organization):
        for stage_data in DEFAULT_STAGES:
            cls.objects.create(organization=organization, **stage_data)


class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="deals"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.ForeignKey(
        PipelineStage, on_delete=models.PROTECT, related_name="deals"
    )
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="deals"
    )
    probability = models.IntegerField(null=True, blank=True)
    expected_close = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
```

**Step 4: Hook default stages into registration**

In `backend/accounts/views.py`, add after org creation:
```python
from deals.models import PipelineStage
# ... inside register(), after Membership.objects.create():
PipelineStage.create_defaults(org)
```

**Step 5: Create serializers, views, urls**

```python
# backend/deals/serializers.py
from rest_framework import serializers
from .models import PipelineStage, Deal


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ["id", "name", "order", "color"]
        read_only_fields = ["id"]


class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = [
            "id", "name", "amount", "stage", "contact",
            "probability", "expected_close", "notes",
            "created_at", "updated_at", "closed_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PipelineDealSerializer(serializers.ModelSerializer):
    """Deal serializer for pipeline view (includes stage name)."""
    stage_name = serializers.CharField(source="stage.name", read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id", "name", "amount", "stage", "stage_name",
            "contact", "probability", "expected_close", "created_at",
        ]
```

```python
# backend/deals/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PipelineStage, Deal
from .serializers import PipelineStageSerializer, DealSerializer, PipelineDealSerializer


class PipelineStageViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineStageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PipelineStage.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Deal.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pipeline_view(request):
    stages = PipelineStage.objects.filter(
        organization=request.organization
    ).prefetch_related("deals")

    result = []
    for stage in stages:
        deals = stage.deals.filter(organization=request.organization)
        result.append({
            "stage": PipelineStageSerializer(stage).data,
            "deals": PipelineDealSerializer(deals, many=True).data,
            "total_amount": sum(d.amount for d in deals),
        })
    return Response(result)
```

```python
# backend/deals/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.DealViewSet, basename="deal")

urlpatterns = [
    path("pipeline/", views.pipeline_view),
    path("", include(router.urls)),
]
```

```python
# backend/deals/stage_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PipelineStageViewSet

router = DefaultRouter()
router.register("", PipelineStageViewSet, basename="pipeline-stage")

urlpatterns = [
    path("", include(router.urls)),
]
```

**Step 6: Make migrations and run tests**

```bash
docker compose exec backend python manage.py makemigrations deals
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py test deals -v 2
```

Expected: All 4 tests PASS.

**Step 7: Commit**

```bash
git add backend/deals/ backend/accounts/views.py
git commit -m "feat: deals and pipeline stages with CRUD and kanban view"
```

---

## Task 6: Tasks/Reminders (tasks app)

Task and reminder CRUD, scoped to organization.

**Files:**
- Create: `backend/tasks/models.py`
- Create: `backend/tasks/serializers.py`
- Create: `backend/tasks/views.py`
- Create: `backend/tasks/urls.py`
- Create: `backend/tasks/tests.py`

**Step 1: Write failing tests**

```python
# backend/tasks/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class TaskTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_task(self):
        response = self.client.post("/api/tasks/", {
            "description": "Rappeler Marie Dupont",
            "due_date": "2026-03-10T10:00:00Z",
            "priority": "high",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["description"], "Rappeler Marie Dupont")

    def test_list_tasks(self):
        self.client.post("/api/tasks/", {
            "description": "Task 1",
            "due_date": "2026-03-10T10:00:00Z",
        })
        self.client.post("/api/tasks/", {
            "description": "Task 2",
            "due_date": "2026-03-11T10:00:00Z",
        })
        response = self.client.get("/api/tasks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_complete_task(self):
        create = self.client.post("/api/tasks/", {
            "description": "Task 1",
            "due_date": "2026-03-10T10:00:00Z",
        })
        task_id = create.data["id"]
        response = self.client.patch(f"/api/tasks/{task_id}/", {
            "is_done": True,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_done"])
```

**Step 2: Run tests to verify they fail**

**Step 3: Create Task model**

```python
# backend/tasks/models.py
import uuid
from django.db import models
from django.conf import settings


class Task(models.Model):
    class Priority(models.TextChoices):
        HIGH = "high", "High"
        NORMAL = "normal", "Normal"
        LOW = "low", "Low"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="tasks"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    description = models.CharField(max_length=500)
    due_date = models.DateTimeField()
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.SET_NULL, null=True, blank=True
    )
    deal = models.ForeignKey(
        "deals.Deal", on_delete=models.SET_NULL, null=True, blank=True
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NORMAL
    )
    is_done = models.BooleanField(default=False)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["due_date"]

    def __str__(self):
        return self.description
```

**Step 4: Create serializers, views, urls** (same pattern as contacts)

```python
# backend/tasks/serializers.py
from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "description", "due_date", "contact", "deal",
            "priority", "is_done", "is_recurring", "recurrence_rule", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
```

```python
# backend/tasks/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )
```

```python
# backend/tasks/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet

router = DefaultRouter()
router.register("", TaskViewSet, basename="task")

urlpatterns = [
    path("", include(router.urls)),
]
```

**Step 5: Make migrations and run tests**

```bash
docker compose exec backend python manage.py makemigrations tasks
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py test tasks -v 2
```

Expected: All 3 tests PASS.

**Step 6: Commit**

```bash
git add backend/tasks/
git commit -m "feat: tasks and reminders CRUD with org scoping"
```

---

## Task 7: Notes & Timeline (notes app)

Timeline entries and notes, linked to contacts and/or deals.

**Files:**
- Create: `backend/notes/models.py`
- Create: `backend/notes/serializers.py`
- Create: `backend/notes/views.py`
- Create: `backend/notes/urls.py`
- Create: `backend/notes/note_urls.py`
- Create: `backend/notes/tests.py`

**Step 1: Write failing tests**

```python
# backend/notes/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class TimelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        # Create a contact to link notes to
        contact_resp = self.client.post("/api/contacts/", {
            "first_name": "Marie", "last_name": "Dupont",
        })
        self.contact_id = contact_resp.data["id"]

    def test_add_note_to_contact(self):
        response = self.client.post("/api/notes/", {
            "contact": self.contact_id,
            "content": "Appel téléphonique, très intéressée par le projet.",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_timeline_for_contact(self):
        self.client.post("/api/notes/", {
            "contact": self.contact_id,
            "content": "Note 1",
        })
        self.client.post("/api/notes/", {
            "contact": self.contact_id,
            "content": "Note 2",
        })
        response = self.client.get(f"/api/timeline/?contact={self.contact_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
```

**Step 2: Run tests to verify they fail**

**Step 3: Create models**

```python
# backend/notes/models.py
import uuid
from django.db import models
from django.conf import settings


class TimelineEntry(models.Model):
    class EntryType(models.TextChoices):
        CONTACT_CREATED = "contact_created"
        DEAL_CREATED = "deal_created"
        DEAL_MOVED = "deal_moved"
        NOTE_ADDED = "note_added"
        TASK_CREATED = "task_created"
        CHAT_ACTION = "chat_action"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="timeline_entries"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.CASCADE, null=True, blank=True,
        related_name="timeline_entries"
    )
    deal = models.ForeignKey(
        "deals.Deal", on_delete=models.CASCADE, null=True, blank=True,
        related_name="timeline_entries"
    )
    entry_type = models.CharField(max_length=50, choices=EntryType.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.entry_type}: {self.content[:50]}"
```

**Step 4: Create serializers, views, urls**

```python
# backend/notes/serializers.py
from rest_framework import serializers
from .models import TimelineEntry


class TimelineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEntry
        fields = [
            "id", "contact", "deal", "entry_type", "content",
            "metadata", "created_at",
        ]
        read_only_fields = ["id", "entry_type", "created_at"]


class NoteCreateSerializer(serializers.Serializer):
    contact = serializers.UUIDField(required=False, allow_null=True)
    deal = serializers.UUIDField(required=False, allow_null=True)
    content = serializers.CharField()
```

```python
# backend/notes/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import TimelineEntry
from .serializers import TimelineEntrySerializer, NoteCreateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def timeline_list(request):
    entries = TimelineEntry.objects.filter(organization=request.organization)
    contact_id = request.query_params.get("contact")
    deal_id = request.query_params.get("deal")
    if contact_id:
        entries = entries.filter(contact_id=contact_id)
    if deal_id:
        entries = entries.filter(deal_id=deal_id)
    return Response(TimelineEntrySerializer(entries, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_note(request):
    serializer = NoteCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    entry = TimelineEntry.objects.create(
        organization=request.organization,
        created_by=request.user,
        contact_id=serializer.validated_data.get("contact"),
        deal_id=serializer.validated_data.get("deal"),
        entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        content=serializer.validated_data["content"],
    )
    return Response(
        TimelineEntrySerializer(entry).data, status=status.HTTP_201_CREATED
    )
```

```python
# backend/notes/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.timeline_list),
]
```

```python
# backend/notes/note_urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.create_note),
]
```

**Step 5: Make migrations and run tests**

```bash
docker compose exec backend python manage.py makemigrations notes
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py test notes -v 2
```

Expected: All 2 tests PASS.

**Step 6: Commit**

```bash
git add backend/notes/
git commit -m "feat: timeline entries and notes with contact/deal linking"
```

---

## Task 8: Dashboard Stats (dashboard app)

Simple stats API for the dashboard.

**Files:**
- Create: `backend/dashboard/views.py`
- Create: `backend/dashboard/urls.py`
- Create: `backend/dashboard/tests.py`

**Step 1: Write failing tests**

```python
# backend/dashboard/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_dashboard_stats(self):
        response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("revenue_this_month", response.data)
        self.assertIn("total_pipeline", response.data)
        self.assertIn("deals_by_stage", response.data)
        self.assertIn("upcoming_tasks", response.data)
```

**Step 2: Run to verify fail**

**Step 3: Create views and urls**

```python
# backend/dashboard/views.py
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum

from deals.models import Deal, PipelineStage
from tasks.models import Task


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    org = request.organization
    now = timezone.now()

    # Revenue this month (deals won this month)
    won_stages = PipelineStage.objects.filter(organization=org, name="Gagné")
    revenue = Deal.objects.filter(
        organization=org,
        stage__in=won_stages,
        closed_at__year=now.year,
        closed_at__month=now.month,
    ).aggregate(total=Sum("amount"))["total"] or 0

    # Total pipeline (all active deals, excluding won/lost)
    excluded_names = ["Gagné", "Perdu"]
    active_deals = Deal.objects.filter(
        organization=org,
    ).exclude(stage__name__in=excluded_names)
    total_pipeline = active_deals.aggregate(total=Sum("amount"))["total"] or 0

    # Deals by stage
    stages = PipelineStage.objects.filter(organization=org)
    deals_by_stage = []
    for stage in stages:
        stage_deals = Deal.objects.filter(organization=org, stage=stage)
        deals_by_stage.append({
            "stage_id": str(stage.id),
            "stage_name": stage.name,
            "stage_color": stage.color,
            "count": stage_deals.count(),
            "total_amount": float(stage_deals.aggregate(total=Sum("amount"))["total"] or 0),
        })

    # Upcoming tasks (next 7 days, not done)
    week_from_now = now + timezone.timedelta(days=7)
    upcoming_tasks = Task.objects.filter(
        organization=org,
        is_done=False,
        due_date__lte=week_from_now,
    ).count()

    return Response({
        "revenue_this_month": float(revenue),
        "total_pipeline": float(total_pipeline),
        "deals_by_stage": deals_by_stage,
        "upcoming_tasks": upcoming_tasks,
        "active_deals_count": active_deals.count(),
    })
```

```python
# backend/dashboard/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("stats/", views.dashboard_stats),
]
```

**Step 4: Run tests**

```bash
docker compose exec backend python manage.py test dashboard -v 2
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/dashboard/
git commit -m "feat: dashboard stats endpoint"
```

---

## Task 9: Chat IA with Pydantic AI (chat app)

The core of the product — AI chat with tool calling.

**Files:**
- Create: `backend/chat/models.py`
- Create: `backend/chat/agent.py`
- Create: `backend/chat/tools.py`
- Create: `backend/chat/prompts.py`
- Create: `backend/chat/serializers.py`
- Create: `backend/chat/views.py`
- Create: `backend/chat/urls.py`
- Create: `backend/chat/tests.py`

**Step 1: Create ChatMessage model**

```python
# backend/chat/models.py
import uuid
from django.db import models
from django.conf import settings


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="chat_messages"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    actions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
```

**Step 2: Create system prompt**

```python
# backend/chat/prompts.py
SYSTEM_PROMPT = """Tu es l'assistant CRM intelligent de {user_name}. Tu aides à gérer les contacts, deals, tâches et notes.

## Tes capacités
Tu peux :
- Créer, modifier et rechercher des contacts
- Créer et gérer des deals dans le pipeline
- Programmer des rappels et tâches
- Ajouter des notes à des contacts ou deals
- Donner un résumé de l'activité (dashboard)
- Rechercher dans toutes les données

## Comportement
- Extrais automatiquement les entités (noms, entreprises, montants, dates) du message de l'utilisateur
- Si une information est ambiguë, pose UNE question de clarification
- Avant de créer un contact, vérifie s'il existe déjà (utilise search_contacts)
- Confirme chaque action effectuée de manière claire et structurée
- Réponds dans la langue de l'utilisateur (français ou anglais)
- Sois concis et professionnel

## Contexte actuel
- Contacts récents : {contacts_summary}
- Deals actifs : {deals_summary}
- Tâches à venir : {tasks_summary}

## Format de réponse
Quand tu effectues des actions, structure ta réponse ainsi :
- Texte de confirmation pour chaque action
- Si tu as des suggestions (ex: créer un rappel associé), propose-les

N'utilise PAS de markdown excessif. Reste naturel et conversationnel.
"""
```

**Step 3: Create tools**

```python
# backend/chat/tools.py
from pydantic_ai import RunContext
from contacts.models import Contact
from deals.models import Deal, PipelineStage
from tasks.models import Task
from notes.models import TimelineEntry
from django.db.models import Q, Sum
from django.utils import timezone


async def create_contact(
    ctx: RunContext,
    first_name: str,
    last_name: str,
    company: str = "",
    email: str = "",
    phone: str = "",
) -> dict:
    """Create a new contact in the CRM."""
    org = ctx.deps["organization"]
    user = ctx.deps["user"]

    contact = await Contact.objects.acreate(
        organization=org,
        created_by=user,
        first_name=first_name,
        last_name=last_name,
        company=company,
        email=email,
        phone=phone,
    )
    await TimelineEntry.objects.acreate(
        organization=org,
        created_by=user,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_CREATED,
        content=f"Contact créé : {first_name} {last_name}",
    )
    return {
        "action": "contact_created",
        "id": str(contact.id),
        "name": f"{first_name} {last_name}",
        "company": company,
    }


async def search_contacts(ctx: RunContext, query: str) -> list[dict]:
    """Search contacts by name, company, or email."""
    org = ctx.deps["organization"]
    contacts = Contact.objects.filter(
        organization=org,
    ).filter(
        Q(first_name__icontains=query)
        | Q(last_name__icontains=query)
        | Q(company__icontains=query)
        | Q(email__icontains=query)
    )[:10]
    results = []
    async for c in contacts:
        results.append({
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}",
            "company": c.company,
            "email": c.email,
        })
    return results


async def create_deal(
    ctx: RunContext,
    name: str,
    amount: float,
    contact_id: str = None,
    stage_name: str = "Premier contact",
) -> dict:
    """Create a new deal in the pipeline."""
    org = ctx.deps["organization"]
    user = ctx.deps["user"]

    stage = await PipelineStage.objects.filter(
        organization=org, name__icontains=stage_name
    ).afirst()
    if not stage:
        stage = await PipelineStage.objects.filter(organization=org).order_by("order").afirst()

    deal = await Deal.objects.acreate(
        organization=org,
        created_by=user,
        name=name,
        amount=amount,
        stage=stage,
        contact_id=contact_id,
    )
    await TimelineEntry.objects.acreate(
        organization=org,
        created_by=user,
        deal=deal,
        contact_id=contact_id,
        entry_type=TimelineEntry.EntryType.DEAL_CREATED,
        content=f"Deal créé : {name} — {amount}€",
    )
    return {
        "action": "deal_created",
        "id": str(deal.id),
        "name": name,
        "amount": amount,
        "stage": stage.name,
    }


async def move_deal(ctx: RunContext, deal_id: str, new_stage_name: str) -> dict:
    """Move a deal to a different pipeline stage."""
    org = ctx.deps["organization"]
    user = ctx.deps["user"]

    deal = await Deal.objects.filter(organization=org, id=deal_id).afirst()
    if not deal:
        return {"error": "Deal not found"}

    stage = await PipelineStage.objects.filter(
        organization=org, name__icontains=new_stage_name
    ).afirst()
    if not stage:
        return {"error": f"Stage '{new_stage_name}' not found"}

    old_stage_name = (await PipelineStage.objects.aget(id=deal.stage_id)).name
    deal.stage = stage
    if new_stage_name.lower() in ["gagné", "perdu"]:
        deal.closed_at = timezone.now()
    await deal.asave()

    await TimelineEntry.objects.acreate(
        organization=org,
        created_by=user,
        deal=deal,
        entry_type=TimelineEntry.EntryType.DEAL_MOVED,
        content=f"Deal déplacé : {old_stage_name} → {stage.name}",
    )
    return {
        "action": "deal_moved",
        "id": str(deal.id),
        "name": deal.name,
        "old_stage": old_stage_name,
        "new_stage": stage.name,
    }


async def create_task(
    ctx: RunContext,
    description: str,
    due_date: str,
    contact_id: str = None,
    deal_id: str = None,
    priority: str = "normal",
) -> dict:
    """Create a task or reminder."""
    org = ctx.deps["organization"]
    user = ctx.deps["user"]

    task = await Task.objects.acreate(
        organization=org,
        created_by=user,
        description=description,
        due_date=due_date,
        contact_id=contact_id,
        deal_id=deal_id,
        priority=priority,
    )
    await TimelineEntry.objects.acreate(
        organization=org,
        created_by=user,
        contact_id=contact_id,
        deal_id=deal_id,
        entry_type=TimelineEntry.EntryType.TASK_CREATED,
        content=f"Rappel créé : {description}",
    )
    return {
        "action": "task_created",
        "id": str(task.id),
        "description": description,
        "due_date": due_date,
    }


async def complete_task(ctx: RunContext, task_id: str) -> dict:
    """Mark a task as completed."""
    org = ctx.deps["organization"]
    task = await Task.objects.filter(organization=org, id=task_id).afirst()
    if not task:
        return {"error": "Task not found"}
    task.is_done = True
    await task.asave()
    return {"action": "task_completed", "id": str(task.id), "description": task.description}


async def add_note(
    ctx: RunContext,
    content: str,
    contact_id: str = None,
    deal_id: str = None,
) -> dict:
    """Add a note to a contact or deal."""
    org = ctx.deps["organization"]
    user = ctx.deps["user"]

    entry = await TimelineEntry.objects.acreate(
        organization=org,
        created_by=user,
        contact_id=contact_id,
        deal_id=deal_id,
        entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        content=content,
    )
    return {
        "action": "note_added",
        "id": str(entry.id),
        "content": content[:100],
    }


async def get_dashboard_summary(ctx: RunContext) -> dict:
    """Get a summary of the user's CRM activity."""
    org = ctx.deps["organization"]
    now = timezone.now()

    won_stages = PipelineStage.objects.filter(organization=org, name="Gagné")
    revenue = await Deal.objects.filter(
        organization=org,
        stage__in=won_stages,
        closed_at__year=now.year,
        closed_at__month=now.month,
    ).aaggregate(total=Sum("amount"))
    revenue_total = revenue.get("total") or 0

    excluded = ["Gagné", "Perdu"]
    active_count = await Deal.objects.filter(
        organization=org
    ).exclude(stage__name__in=excluded).acount()

    pending_tasks = await Task.objects.filter(
        organization=org, is_done=False
    ).acount()

    return {
        "action": "dashboard_summary",
        "revenue_this_month": float(revenue_total),
        "active_deals": active_count,
        "pending_tasks": pending_tasks,
    }


async def search_all(ctx: RunContext, query: str) -> dict:
    """Search across contacts, deals, and notes."""
    org = ctx.deps["organization"]

    contacts = []
    async for c in Contact.objects.filter(
        organization=org,
    ).filter(
        Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(company__icontains=query)
    )[:5]:
        contacts.append({"id": str(c.id), "name": f"{c.first_name} {c.last_name}", "company": c.company})

    deals = []
    async for d in Deal.objects.filter(organization=org, name__icontains=query)[:5]:
        deals.append({"id": str(d.id), "name": d.name, "amount": float(d.amount)})

    notes = []
    async for n in TimelineEntry.objects.filter(
        organization=org, content__icontains=query
    )[:5]:
        notes.append({"id": str(n.id), "content": n.content[:100], "type": n.entry_type})

    return {"contacts": contacts, "deals": deals, "notes": notes}
```

**Step 4: Create the Pydantic AI agent**

```python
# backend/chat/agent.py
from django.conf import settings
from pydantic_ai import Agent

from .prompts import SYSTEM_PROMPT
from . import tools


def build_agent():
    agent = Agent(
        model=settings.AI_MODEL,
        system_prompt=SYSTEM_PROMPT,
    )

    # Register tools
    agent.tool(tools.create_contact)
    agent.tool(tools.search_contacts)
    agent.tool(tools.create_deal)
    agent.tool(tools.move_deal)
    agent.tool(tools.create_task)
    agent.tool(tools.complete_task)
    agent.tool(tools.add_note)
    agent.tool(tools.get_dashboard_summary)
    agent.tool(tools.search_all)

    return agent
```

**Step 5: Create views with SSE streaming**

```python
# backend/chat/serializers.py
from rest_framework import serializers
from .models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "actions", "created_at"]
        read_only_fields = fields


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField()
```

```python
# backend/chat/views.py
import json
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contacts.models import Contact
from deals.models import Deal, PipelineStage
from tasks.models import Task
from .models import ChatMessage
from .serializers import ChatMessageSerializer, ChatInputSerializer
from .agent import build_agent
from .prompts import SYSTEM_PROMPT


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    serializer = ChatInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user_message = serializer.validated_data["message"]
    org = request.organization

    # Save user message
    ChatMessage.objects.create(
        organization=org,
        user=request.user,
        role=ChatMessage.Role.USER,
        content=user_message,
    )

    # Build context
    contacts = Contact.objects.filter(organization=org)[:20]
    contacts_summary = ", ".join(
        f"{c.first_name} {c.last_name} ({c.company})" for c in contacts
    ) or "Aucun contact"

    deals = Deal.objects.filter(organization=org).exclude(
        stage__name__in=["Gagné", "Perdu"]
    )[:10]
    deals_summary = ", ".join(
        f"{d.name} ({d.amount}€, {d.stage.name})" for d in deals.select_related("stage")
    ) or "Aucun deal actif"

    tasks = Task.objects.filter(organization=org, is_done=False)[:10]
    tasks_summary = ", ".join(
        f"{t.description} (due: {t.due_date.strftime('%d/%m/%Y')})" for t in tasks
    ) or "Aucune tâche"

    # Build prompt with context
    formatted_prompt = SYSTEM_PROMPT.format(
        user_name=request.user.first_name,
        contacts_summary=contacts_summary,
        deals_summary=deals_summary,
        tasks_summary=tasks_summary,
    )

    # Get chat history
    history = ChatMessage.objects.filter(
        organization=org, user=request.user,
    ).order_by("-created_at")[:20]
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(list(history))
    ]

    # Run agent (non-streaming for now, streaming in a follow-up)
    agent = build_agent()
    agent.system_prompt = formatted_prompt

    try:
        result = agent.run_sync(
            user_message,
            message_history=messages,
            deps={
                "organization": org,
                "user": request.user,
            },
        )

        # Collect actions from tool calls
        actions = []
        if hasattr(result, "all_messages"):
            for msg in result.all_messages():
                if hasattr(msg, "tool_return"):
                    try:
                        action_data = json.loads(msg.tool_return) if isinstance(msg.tool_return, str) else msg.tool_return
                        if isinstance(action_data, dict) and "action" in action_data:
                            actions.append(action_data)
                    except (json.JSONDecodeError, TypeError):
                        pass

        response_text = result.data if isinstance(result.data, str) else str(result.data)

        # Save assistant message
        ai_message = ChatMessage.objects.create(
            organization=org,
            user=request.user,
            role=ChatMessage.Role.ASSISTANT,
            content=response_text,
            actions=actions,
        )

        return Response({
            "message": ChatMessageSerializer(ai_message).data,
            "actions": actions,
        })

    except Exception as e:
        return Response(
            {"error": f"AI error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_history(request):
    messages = ChatMessage.objects.filter(
        organization=request.organization,
        user=request.user,
    )[:50]
    return Response(ChatMessageSerializer(messages, many=True).data)
```

```python
# backend/chat/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("message/", views.send_message),
    path("history/", views.chat_history),
]
```

**Step 6: Make migrations and run basic tests**

```bash
docker compose exec backend python manage.py makemigrations chat
docker compose exec backend python manage.py migrate
```

**Step 7: Write basic chat tests** (without real AI calls — mock the agent)

```python
# backend/chat/tests.py
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import ChatMessage


class ChatTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post("/api/auth/register/", {
            "email": "hugo@example.com",
            "password": "securepass123",
            "first_name": "Hugo",
            "last_name": "Frely",
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_chat_history_empty(self):
        response = self.client.get("/api/chat/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    @patch("chat.views.build_agent")
    def test_send_message_saves_user_message(self, mock_build):
        mock_agent = MagicMock()
        mock_result = MagicMock()
        mock_result.data = "OK, j'ai compris."
        mock_result.all_messages.return_value = []
        mock_agent.run_sync.return_value = mock_result
        mock_build.return_value = mock_agent

        response = self.client.post("/api/chat/message/", {
            "message": "Salut, j'ai eu un call avec Marie",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # User message saved
        user_msgs = ChatMessage.objects.filter(role="user")
        self.assertEqual(user_msgs.count(), 1)
        self.assertIn("Marie", user_msgs.first().content)

        # AI message saved
        ai_msgs = ChatMessage.objects.filter(role="assistant")
        self.assertEqual(ai_msgs.count(), 1)
```

**Step 8: Run tests**

```bash
docker compose exec backend python manage.py test chat -v 2
```

Expected: All tests PASS.

**Step 9: Commit**

```bash
git add backend/chat/
git commit -m "feat: AI chat with Pydantic AI tools for contacts, deals, tasks"
```

---

## Task 10: Run all backend tests

**Step 1: Run full test suite**

```bash
docker compose exec backend python manage.py test -v 2
```

Expected: All tests across all apps PASS.

**Step 2: Commit if any fixes were needed**

---

## Task 11: Frontend — Auth Pages (login + register)

Set up the Next.js frontend with auth pages, API client, and JWT token management.

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/auth.tsx`
- Create: `frontend/app/(auth)/layout.tsx`
- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/(auth)/register/page.tsx`
- Install: shadcn/ui components (button, input, card, label)

**Step 1: Install shadcn/ui and required deps**

```bash
cd frontend
npx shadcn@latest init
npx shadcn@latest add button input card label toast
npm install js-cookie
npm install -D @types/js-cookie
```

**Step 2: Create API client**

```typescript
// frontend/lib/api.ts
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

interface FetchOptions extends RequestInit {
  json?: unknown
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  }

  const token = Cookies.get("access_token")
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (json) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: json ? JSON.stringify(json) : rest.body,
  })

  if (response.status === 401) {
    // Try refresh
    const refreshed = await refreshToken()
    if (refreshed) {
      headers.Authorization = `Bearer ${Cookies.get("access_token")}`
      const retryResponse = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers,
        body: json ? JSON.stringify(json) : rest.body,
      })
      if (!retryResponse.ok) throw new Error(`API error: ${retryResponse.status}`)
      return retryResponse.json()
    }
    // Redirect to login
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(JSON.stringify(error))
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

async function refreshToken(): Promise<boolean> {
  const refresh = Cookies.get("refresh_token")
  if (!refresh) return false

  try {
    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) return false
    const data = await response.json()
    Cookies.set("access_token", data.access, { expires: 1 / 24 }) // 1h
    return true
  } catch {
    return false
  }
}

export function setTokens(access: string, refresh: string) {
  Cookies.set("access_token", access, { expires: 1 / 24 })
  Cookies.set("refresh_token", refresh, { expires: 7 })
}

export function clearTokens() {
  Cookies.remove("access_token")
  Cookies.remove("refresh_token")
}
```

**Step 3: Create auth context**

```typescript
// frontend/lib/auth.tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { apiFetch, setTokens, clearTokens } from "./api"

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<User>("/auth/me/")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; access: string; refresh: string }>(
      "/auth/login/",
      { method: "POST", json: { email, password } }
    )
    setTokens(data.access, data.refresh)
    setUser(data.user)
  }

  const register = async (formData: { email: string; password: string; first_name: string; last_name: string }) => {
    const data = await apiFetch<{ user: User; access: string; refresh: string }>(
      "/auth/register/",
      { method: "POST", json: formData }
    )
    setTokens(data.access, data.refresh)
    setUser(data.user)
  }

  const logout = () => {
    clearTokens()
    setUser(null)
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
```

**Step 4: Create auth layout**

```tsx
// frontend/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  )
}
```

**Step 5: Create login page**

```tsx
// frontend/app/(auth)/login/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      router.push("/chat")
    } catch {
      setError("Email ou mot de passe incorrect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Qeylo</CardTitle>
        <CardDescription>Connecte-toi à ton CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Inscris-toi
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 6: Create register page** (same pattern as login, with first_name and last_name fields)

**Step 7: Wrap root layout with AuthProvider**

In `frontend/app/layout.tsx`, wrap children with `<AuthProvider>`.

**Step 8: Test manually**

Open http://localhost:3000/register — should show register form. Register → redirects to /chat.

**Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: frontend auth pages with JWT token management"
```

---

## Task 12: Frontend — App Layout & Navigation

Sidebar navigation with links to all main pages.

**Files:**
- Create: `frontend/app/(app)/layout.tsx`
- Create: `frontend/components/Sidebar.tsx`
- Install: `lucide-react` for icons

**Step 1: Install icons**

```bash
cd frontend && npm install lucide-react
```

**Step 2: Create Sidebar component**

The sidebar should have links to: Chat, Contacts, Deals (pipeline), Tasks, Dashboard, Settings. Use lucide-react icons. Highlight active route. Show user name at bottom with logout.

**Step 3: Create app layout**

```tsx
// frontend/app/(app)/layout.tsx
"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (!user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

**Step 4: Create placeholder pages**

Create empty placeholder pages for each route:
- `frontend/app/(app)/chat/page.tsx` — "Chat IA (à venir)"
- `frontend/app/(app)/contacts/page.tsx` — "Contacts (à venir)"
- `frontend/app/(app)/deals/page.tsx` — "Pipeline (à venir)"
- `frontend/app/(app)/tasks/page.tsx` — "Tâches (à venir)"
- `frontend/app/(app)/dashboard/page.tsx` — "Dashboard (à venir)"
- `frontend/app/(app)/settings/page.tsx` — "Paramètres (à venir)"

**Step 5: Test navigation manually**

All links work, sidebar highlights active route, logout works.

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: app layout with sidebar navigation"
```

---

## Task 13: Frontend — Chat Page

The core UI: chat input, message display, action cards, streaming.

**Files:**
- Create: `frontend/components/chat/ChatWindow.tsx`
- Create: `frontend/components/chat/ChatInput.tsx`
- Create: `frontend/components/chat/ChatMessage.tsx`
- Create: `frontend/components/chat/ActionCard.tsx`
- Modify: `frontend/app/(app)/chat/page.tsx`

**Step 1: Create ChatInput component**

Text input with send button. Auto-focus. Submit on Enter (Shift+Enter for newline).

**Step 2: Create ActionCard component**

Card component that renders differently based on action type:
- `contact_created` → Shows contact name, company, "Voir" link
- `deal_created` → Shows deal name, amount, stage
- `task_created` → Shows description, due date
- `deal_moved` → Shows deal name, old stage → new stage
- `note_added` → Shows note excerpt
- `dashboard_summary` → Shows revenue, active deals, pending tasks

**Step 3: Create ChatMessage component**

Renders a single message bubble. For AI messages, renders the text + any ActionCards from the `actions` array.

**Step 4: Create ChatWindow component**

- Loads chat history on mount via `GET /api/chat/history/`
- Displays messages with auto-scroll to bottom
- Sends messages via `POST /api/chat/message/`
- Shows loading state while AI is responding
- Appends AI response to message list

**Step 5: Update chat page**

```tsx
// frontend/app/(app)/chat/page.tsx
import { ChatWindow } from "@/components/chat/ChatWindow"

export default function ChatPage() {
  return <ChatWindow />
}
```

**Step 6: Test manually**

Open chat, send a message, verify it hits the API, shows loading, and displays the response with action cards.

**Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: chat UI with messages, action cards, and AI integration"
```

---

## Task 14: Frontend — Contacts Pages

Contact list with table and contact detail page with timeline.

**Files:**
- Create: `frontend/components/contacts/ContactTable.tsx`
- Create: `frontend/components/contacts/ContactTimeline.tsx`
- Modify: `frontend/app/(app)/contacts/page.tsx`
- Create: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Create ContactTable**

Table with columns: Name, Company, Email, Phone, Tags, Created. Sortable. Search bar at top.

**Step 2: Create contacts list page**

Fetch contacts from `GET /api/contacts/`, display in table. "Add" button opens the chat (redirects to /chat with a prefilled suggestion).

**Step 3: Create ContactTimeline**

Fetch timeline for a contact from `GET /api/timeline/?contact=ID`. Display chronologically.

**Step 4: Create contact detail page**

Show contact info at top, timeline below. Edit button (or just link to chat: "modifie le contact Marie...").

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: contacts list and detail pages with timeline"
```

---

## Task 15: Frontend — Deals Pipeline (Kanban)

Drag & drop Kanban board for the deal pipeline.

**Files:**
- Install: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Create: `frontend/components/deals/KanbanBoard.tsx`
- Create: `frontend/components/deals/KanbanColumn.tsx`
- Create: `frontend/components/deals/DealCard.tsx`
- Modify: `frontend/app/(app)/deals/page.tsx`

**Step 1: Install dnd-kit**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Create DealCard**

Card showing deal name, amount, contact name. Draggable.

**Step 3: Create KanbanColumn**

Column with stage name, color indicator, total amount, list of DealCards. Droppable.

**Step 4: Create KanbanBoard**

Fetches pipeline data from `GET /api/deals/pipeline/`. Renders columns. On drag end, calls `PATCH /api/deals/:id/` to move the deal.

**Step 5: Update deals page**

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: Kanban pipeline with drag and drop"
```

---

## Task 16: Frontend — Tasks Page

Task list with filters and completion toggle.

**Files:**
- Create: `frontend/components/tasks/TaskList.tsx`
- Modify: `frontend/app/(app)/tasks/page.tsx`

**Step 1: Create TaskList**

List of tasks with checkbox for completion. Filter by: all, pending, done. Show due date, priority badge, linked contact/deal name.

**Step 2: Update tasks page**

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: tasks page with filters and completion"
```

---

## Task 17: Frontend — Dashboard Page

Stats cards and deal breakdown.

**Files:**
- Create: `frontend/components/dashboard/StatCard.tsx`
- Modify: `frontend/app/(app)/dashboard/page.tsx`

**Step 1: Create StatCard**

Reusable card showing a label, value, and optional icon/color.

**Step 2: Create dashboard page**

Fetch stats from `GET /api/dashboard/stats/`. Display:
- Revenue this month
- Total pipeline value
- Active deals count
- Upcoming tasks count
- Deals by stage (simple bar or list)

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: dashboard page with stats"
```

---

## Task 18: Frontend — Settings Pages

User profile and pipeline customization.

**Files:**
- Modify: `frontend/app/(app)/settings/page.tsx`
- Create: `frontend/app/(app)/settings/pipeline/page.tsx`

**Step 1: Profile settings page**

Form to update first_name, last_name. Display email (read-only). (Needs a PATCH /api/auth/me/ endpoint on backend — add it.)

**Step 2: Pipeline settings page**

List of pipeline stages with drag to reorder, edit name/color, add new stage, delete stage.

**Step 3: Commit**

```bash
git add frontend/ backend/
git commit -m "feat: settings pages for profile and pipeline customization"
```

---

## Task 19: End-to-End Smoke Test

Verify the full flow works end to end.

**Step 1: Start everything**

```bash
docker compose up --build
```

**Step 2: Register a new user**

Go to http://localhost:3000/register, create an account.

**Step 3: Send a chat message**

Type: "J'ai eu un call avec Marie Dupont de Decathlon, elle veut un devis pour un site e-commerce, budget environ 15k, faut que je la rappelle jeudi."

Verify:
- AI responds with action cards for contact, deal, and task
- Contact appears in /contacts
- Deal appears in /deals pipeline
- Task appears in /tasks

**Step 4: Verify other pages**

- Dashboard shows stats
- Contact detail shows timeline
- Pipeline drag & drop works
- Settings work

**Step 5: Fix any issues found**

**Step 6: Final commit**

```bash
git add -A
git commit -m "fix: end-to-end smoke test fixes"
```

---

## Summary

| Task | Description | Key files |
|---|---|---|
| 1 | Project scaffolding + Docker Compose | docker-compose.yml, Dockerfiles, settings.py |
| 2 | User model + auth (register, login, JWT) | backend/accounts/ |
| 3 | Organization + Membership + middleware | backend/organizations/ |
| 4 | Contacts CRUD + search | backend/contacts/ |
| 5 | Deals + Pipeline stages + kanban view | backend/deals/ |
| 6 | Tasks/Reminders CRUD | backend/tasks/ |
| 7 | Notes + Timeline entries | backend/notes/ |
| 8 | Dashboard stats endpoint | backend/dashboard/ |
| 9 | Chat IA with Pydantic AI tools | backend/chat/ |
| 10 | Run all backend tests | — |
| 11 | Frontend auth pages (login/register) | frontend/app/(auth)/, frontend/lib/ |
| 12 | Frontend app layout + sidebar nav | frontend/app/(app)/layout.tsx |
| 13 | Frontend chat page (core UI) | frontend/components/chat/ |
| 14 | Frontend contacts pages | frontend/components/contacts/ |
| 15 | Frontend deals pipeline (Kanban) | frontend/components/deals/ |
| 16 | Frontend tasks page | frontend/components/tasks/ |
| 17 | Frontend dashboard page | frontend/components/dashboard/ |
| 18 | Frontend settings pages | frontend/app/(app)/settings/ |
| 19 | End-to-end smoke test | — |
