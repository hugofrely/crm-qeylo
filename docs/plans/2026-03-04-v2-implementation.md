# Qeylo CRM V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add notifications, email (Resend), member invitations, automatic reminders, and CSV import to the existing Qeylo CRM.

**Architecture:** Sequential feature build — notifications model is the foundation, Resend email is the transport layer, then invitations/reminders/import consume both. All backend in Django + DRF, frontend in Next.js + shadcn/ui. Tests use Django TestCase with APIClient (SQLite in-memory for tests).

**Tech Stack:** Django 5.1.4, DRF, Resend Python SDK, Next.js 16, shadcn/ui, Tailwind CSS

---

## Task 1: Create notifications Django app + model

**Files:**
- Create: `backend/notifications/__init__.py`
- Create: `backend/notifications/models.py`
- Create: `backend/notifications/admin.py`
- Create: `backend/notifications/apps.py`
- Modify: `backend/config/settings.py:30` (add to INSTALLED_APPS)

**Step 1: Create the app directory and files**

Create `backend/notifications/apps.py`:
```python
from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"
```

Create empty `backend/notifications/__init__.py`.

Create `backend/notifications/admin.py`:
```python
from django.contrib import admin
from .models import Notification

admin.site.register(Notification)
```

**Step 2: Write the model**

Create `backend/notifications/models.py`:
```python
import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        REMINDER = "reminder"
        INVITATION = "invitation"
        DEAL_UPDATE = "deal_update"
        TASK_DUE = "task_due"
        IMPORT_COMPLETE = "import_complete"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=50, choices=Type.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type}: {self.title}"
```

**Step 3: Register in settings**

In `backend/config/settings.py`, add `"notifications"` after `"dashboard"` in `INSTALLED_APPS`.

**Step 4: Run migrations**

Run: `cd backend && python manage.py makemigrations notifications && python manage.py migrate`
Expected: Migration created and applied successfully.

**Step 5: Commit**

```bash
git add backend/notifications/ backend/config/settings.py
git commit -m "feat: add notifications app with Notification model"
```

---

## Task 2: Notifications API (serializers, views, urls)

**Files:**
- Create: `backend/notifications/serializers.py`
- Create: `backend/notifications/views.py`
- Create: `backend/notifications/urls.py`
- Modify: `backend/config/urls.py` (add notifications route)

**Step 1: Write the serializer**

Create `backend/notifications/serializers.py`:
```python
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "type", "title", "message", "link",
            "is_read", "created_at",
        ]
        read_only_fields = fields
```

**Step 2: Write the views**

Create `backend/notifications/views.py`:
```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """List notifications for the current user, unread first."""
    qs = Notification.objects.filter(
        organization=request.organization,
        recipient=request.user,
    ).order_by("is_read", "-created_at")
    page = request.query_params.get("page", 1)
    # Simple manual pagination (20 per page)
    try:
        page = int(page)
    except ValueError:
        page = 1
    start = (page - 1) * 20
    end = start + 20
    notifications = qs[start:end]
    return Response(NotificationSerializer(notifications, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read(request):
    """Mark specific notifications as read."""
    ids = request.data.get("ids", [])
    if not ids:
        return Response(
            {"detail": "ids is required"}, status=status.HTTP_400_BAD_REQUEST
        )
    Notification.objects.filter(
        id__in=ids,
        recipient=request.user,
        organization=request.organization,
    ).update(is_read=True)
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all notifications as read."""
    Notification.objects.filter(
        recipient=request.user,
        organization=request.organization,
        is_read=False,
    ).update(is_read=True)
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Return count of unread notifications."""
    count = Notification.objects.filter(
        recipient=request.user,
        organization=request.organization,
        is_read=False,
    ).count()
    return Response({"count": count})
```

**Step 3: Write URLs**

Create `backend/notifications/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path("", views.notification_list),
    path("read/", views.mark_read),
    path("read-all/", views.mark_all_read),
    path("unread-count/", views.unread_count),
]
```

**Step 4: Register in main urls**

In `backend/config/urls.py`, add:
```python
path("api/notifications/", include("notifications.urls")),
```

**Step 5: Commit**

```bash
git add backend/notifications/serializers.py backend/notifications/views.py backend/notifications/urls.py backend/config/urls.py
git commit -m "feat: add notifications API endpoints"
```

---

## Task 3: Notifications backend tests

**Files:**
- Create: `backend/notifications/tests.py`

**Step 1: Write the tests**

Create `backend/notifications/tests.py`:
```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from notifications.models import Notification
from organizations.models import Organization, Membership
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create user via register endpoint
        reg = self.client.post("/api/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "first_name": "Test",
            "last_name": "User",
        })
        self.token = reg.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.user = User.objects.get(email="test@example.com")
        self.org = Organization.objects.filter(
            memberships__user=self.user
        ).first()

    def _create_notification(self, **kwargs):
        defaults = {
            "organization": self.org,
            "recipient": self.user,
            "type": "reminder",
            "title": "Test notification",
            "message": "This is a test",
        }
        defaults.update(kwargs)
        return Notification.objects.create(**defaults)

    def test_list_notifications(self):
        self._create_notification()
        self._create_notification(title="Second")
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_unread_first(self):
        self._create_notification(title="Read", is_read=True)
        self._create_notification(title="Unread", is_read=False)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.data[0]["title"], "Unread")

    def test_mark_read(self):
        n = self._create_notification()
        response = self.client.post("/api/notifications/read/", {
            "ids": [str(n.id)]
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        n.refresh_from_db()
        self.assertTrue(n.is_read)

    def test_mark_all_read(self):
        self._create_notification()
        self._create_notification()
        self.client.post("/api/notifications/read-all/")
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.user, is_read=False
            ).count(),
            0,
        )

    def test_unread_count(self):
        self._create_notification()
        self._create_notification(is_read=True)
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_unauthenticated_rejected(self):
        self.client.credentials()
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

**Step 2: Run tests**

Run: `cd backend && python manage.py test notifications -v 2`
Expected: 6 tests PASS.

**Step 3: Commit**

```bash
git add backend/notifications/tests.py
git commit -m "test: add notification API tests"
```

---

## Task 4: Notification bell in Sidebar (frontend)

**Files:**
- Modify: `frontend/components/Sidebar.tsx`
- Create: `frontend/components/NotificationBell.tsx`

**Step 1: Create NotificationBell component**

Create `frontend/components/NotificationBell.tsx`:
```tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fetch unread count periodically
  const fetchCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ count: number }>(
        "/notifications/unread-count/"
      )
      setUnreadCount(data.count)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [fetchCount])

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Notification[]>("/notifications/")
      setNotifications(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleDropdown = () => {
    const next = !open
    setOpen(next)
    if (next) fetchNotifications()
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await apiFetch("/notifications/read/", {
        method: "POST",
        json: { ids: [n.id] },
      })
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      )
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  const markAllRead = async () => {
    await apiFetch("/notifications/read-all/", { method: "POST" })
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const formatTime = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime()
      const minutes = Math.floor(diff / 60000)
      if (minutes < 1) return "À l'instant"
      if (minutes < 60) return `Il y a ${minutes}min`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `Il y a ${hours}h`
      const days = Math.floor(hours / 24)
      return `Il y a ${days}j`
    } catch {
      return ""
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDropdown}
        className="relative"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune notification
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    !n.is_read && "bg-primary/[0.03]"
                  )}
                >
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  {n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatTime(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add NotificationBell to Sidebar**

In `frontend/components/Sidebar.tsx`:

- Add import: `import { NotificationBell } from "@/components/NotificationBell"`
- Add the bell between the logo and the separator. Replace the logo `<div>` section:

```tsx
{/* Logo + Notifications */}
<div className="flex h-16 items-center justify-between px-6">
  <div className="flex items-center gap-2">
    <MessageSquare className="h-7 w-7 text-primary" />
    <span className="text-xl font-bold tracking-tight">Qeylo</span>
  </div>
  <NotificationBell />
</div>
```

**Step 3: Commit**

```bash
git add frontend/components/NotificationBell.tsx frontend/components/Sidebar.tsx
git commit -m "feat: add notification bell with dropdown in sidebar"
```

---

## Task 5: Add email_notifications field to User model

**Files:**
- Modify: `backend/accounts/models.py:22-33`
- Modify: `backend/accounts/serializers.py:19-23`

**Step 1: Add field to User model**

In `backend/accounts/models.py`, add inside the `User` class after `username = None`:
```python
email_notifications = models.BooleanField(default=True)
```

**Step 2: Add field to UserSerializer**

In `backend/accounts/serializers.py`, update `UserSerializer.Meta.fields`:
```python
fields = ["id", "email", "first_name", "last_name", "email_notifications", "date_joined"]
```

**Step 3: Run migrations**

Run: `cd backend && python manage.py makemigrations accounts && python manage.py migrate`

**Step 4: Commit**

```bash
git add backend/accounts/models.py backend/accounts/serializers.py backend/accounts/migrations/
git commit -m "feat: add email_notifications preference to User model"
```

---

## Task 6: Install Resend + email service

**Files:**
- Modify: `backend/requirements.txt` (add `resend`)
- Modify: `backend/config/settings.py` (add RESEND settings)
- Create: `backend/notifications/email.py`

**Step 1: Add resend to requirements**

Add `resend>=4.0.0` to `backend/requirements.txt`.

**Step 2: Add settings**

In `backend/config/settings.py`, add at the bottom:
```python
# ---------------------------------------------------------------------------
# Resend (Email)
# ---------------------------------------------------------------------------
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "Qeylo <noreply@qeylo.com>")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
```

**Step 3: Create email service**

Create `backend/notifications/email.py`:
```python
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, html: str):
    """Send an email via Resend. No-op if API key not configured."""
    if not settings.RESEND_API_KEY:
        logger.info("RESEND_API_KEY not set — skipping email to %s: %s", to, subject)
        return
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception:
        logger.exception("Failed to send email to %s", to)


def _base_template(content: str) -> str:
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: 700; color: #1a1a1a;">Qeylo</span>
        </div>
        {content}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
            <p style="font-size: 12px; color: #888;">
                Cet email a été envoyé par Qeylo CRM.
                <br>Vous pouvez désactiver les notifications email dans vos paramètres.
            </p>
        </div>
    </div>
    """


def send_invitation_email(to: str, org_name: str, invite_link: str):
    html = _base_template(f"""
        <h2 style="font-size: 18px; color: #1a1a1a; margin: 0 0 12px;">
            Vous êtes invité(e) à rejoindre {org_name}
        </h2>
        <p style="font-size: 14px; color: #555; line-height: 1.6;">
            Cliquez sur le bouton ci-dessous pour accepter l'invitation et rejoindre l'organisation sur Qeylo.
        </p>
        <a href="{invite_link}"
           style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #F97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Accepter l'invitation
        </a>
    """)
    _send(to, f"Invitation à rejoindre {org_name} sur Qeylo", html)


def send_notification_email(to: str, title: str, message: str):
    html = _base_template(f"""
        <h2 style="font-size: 18px; color: #1a1a1a; margin: 0 0 12px;">{title}</h2>
        <p style="font-size: 14px; color: #555; line-height: 1.6;">{message}</p>
        <a href="{settings.FRONTEND_URL}"
           style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #F97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Ouvrir Qeylo
        </a>
    """)
    _send(to, title, html)


def send_reminder_email(to: str, reminders: list[dict]):
    items = "".join(
        f'<li style="margin-bottom: 8px; font-size: 14px; color: #555;">{r["title"]} — {r["message"]}</li>'
        for r in reminders
    )
    html = _base_template(f"""
        <h2 style="font-size: 18px; color: #1a1a1a; margin: 0 0 12px;">
            Vos rappels du jour
        </h2>
        <ul style="padding-left: 20px; line-height: 1.6;">{items}</ul>
        <a href="{settings.FRONTEND_URL}"
           style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #F97316; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Ouvrir Qeylo
        </a>
    """)
    _send(to, "Qeylo — Vos rappels du jour", html)
```

**Step 4: Create helper to send notification + email**

Create `backend/notifications/helpers.py`:
```python
from .models import Notification
from .email import send_notification_email


def create_notification(
    organization,
    recipient,
    type: str,
    title: str,
    message: str,
    link: str = "",
):
    """Create an in-app notification and optionally send email."""
    notification = Notification.objects.create(
        organization=organization,
        recipient=recipient,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    # Send email if user has email notifications enabled
    if getattr(recipient, "email_notifications", True):
        send_notification_email(recipient.email, title, message)
    return notification
```

**Step 5: Commit**

```bash
git add backend/requirements.txt backend/config/settings.py backend/notifications/email.py backend/notifications/helpers.py
git commit -m "feat: add Resend email service + notification helper"
```

---

## Task 7: Email notifications toggle in Settings page (frontend)

**Files:**
- Modify: `frontend/lib/auth.tsx` (add email_notifications to User interface)
- Modify: `frontend/app/(app)/settings/page.tsx` (add toggle)

**Step 1: Update User interface**

In `frontend/lib/auth.tsx`, update the `User` interface:
```typescript
interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  email_notifications: boolean
}
```

**Step 2: Add PATCH /api/auth/me/ endpoint in backend**

In `backend/accounts/views.py`, update the `me` view to handle PATCH:
```python
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        user = request.user
        if "email_notifications" in request.data:
            user.email_notifications = request.data["email_notifications"]
            user.save(update_fields=["email_notifications"])
        return Response(UserSerializer(user).data)
    return Response(UserSerializer(request.user).data)
```

**Step 3: Add toggle to settings page**

In `frontend/app/(app)/settings/page.tsx`, add after the Profile card:

- Import `{ Bell }` from lucide-react and add a `Checkbox` import from shadcn
- Add a new Card section with a toggle for email notifications:

```tsx
{/* Email notification preference */}
<Card>
  <CardContent className="p-0">
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Notifications email</p>
          <p className="text-xs text-muted-foreground">
            Recevoir les rappels et alertes par email
          </p>
        </div>
      </div>
      <Checkbox
        checked={user?.email_notifications ?? true}
        onCheckedChange={async (checked) => {
          await apiFetch("/auth/me/", {
            method: "PATCH",
            json: { email_notifications: !!checked },
          })
        }}
      />
    </div>
  </CardContent>
</Card>
```

Add imports: `import { Bell } from "lucide-react"`, `import { Checkbox } from "@/components/ui/checkbox"`, `import { apiFetch } from "@/lib/api"`.

**Step 4: Commit**

```bash
git add frontend/lib/auth.tsx frontend/app/\(app\)/settings/page.tsx backend/accounts/views.py
git commit -m "feat: add email notification toggle in settings"
```

---

## Task 8: Invitation model + migration

**Files:**
- Modify: `backend/organizations/models.py` (add Invitation model)

**Step 1: Add Invitation model**

In `backend/organizations/models.py`, add after the `Membership` class:
```python
class Invitation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        ACCEPTED = "accepted"
        EXPIRED = "expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="invitations"
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    email = models.EmailField()
    role = models.CharField(
        max_length=10,
        choices=Membership.Role.choices,
        default=Membership.Role.MEMBER,
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"Invitation {self.email} → {self.organization.name}"
```

**Step 2: Run migrations**

Run: `cd backend && python manage.py makemigrations organizations && python manage.py migrate`

**Step 3: Commit**

```bash
git add backend/organizations/models.py backend/organizations/migrations/
git commit -m "feat: add Invitation model to organizations"
```

---

## Task 9: Invitation + members API endpoints

**Files:**
- Modify: `backend/organizations/serializers.py` (add MembershipSerializer, InvitationSerializer)
- Modify: `backend/organizations/views.py` (add invite, members, accept views)
- Modify: `backend/organizations/urls.py` (add new routes)
- Modify: `backend/config/urls.py` (add invite accept route)

**Step 1: Add serializers**

In `backend/organizations/serializers.py`, add:
```python
from .models import Organization, Membership, Invitation
from django.contrib.auth import get_user_model

User = get_user_model()


class MemberSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(source="user.id")
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    role = serializers.CharField()
    joined_at = serializers.DateTimeField()


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["id", "email", "role", "status", "created_at", "expires_at"]
        read_only_fields = ["id", "status", "created_at", "expires_at"]
```

**Step 2: Add views**

In `backend/organizations/views.py`, add imports and new views:
```python
from datetime import timedelta
from django.utils import timezone
from .models import Organization, Membership, Invitation
from .serializers import OrganizationSerializer, MemberSerializer, InvitationSerializer
from notifications.helpers import create_notification
from notifications.email import send_invitation_email
from django.conf import settings as django_settings


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def member_list(request, org_id):
    """List members of an organization."""
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    # Must be a member
    if not Membership.objects.filter(organization=org, user=request.user).exists():
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    memberships = Membership.objects.filter(organization=org).select_related("user")
    invitations = Invitation.objects.filter(organization=org, status="pending")
    return Response({
        "members": MemberSerializer(memberships, many=True).data,
        "invitations": InvitationSerializer(invitations, many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invite_member(request, org_id):
    """Invite a member by email. Owner/admin only."""
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    membership = Membership.objects.filter(organization=org, user=request.user).first()
    if not membership or membership.role not in ("owner", "admin"):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    email = request.data.get("email", "").strip().lower()
    role = request.data.get("role", "member")
    if not email:
        return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
    if role not in ("admin", "member"):
        return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)

    # Check if already a member
    from django.contrib.auth import get_user_model
    User = get_user_model()
    existing_user = User.objects.filter(email=email).first()
    if existing_user and Membership.objects.filter(organization=org, user=existing_user).exists():
        return Response({"detail": "Already a member"}, status=status.HTTP_400_BAD_REQUEST)

    # Check if pending invitation exists
    if Invitation.objects.filter(organization=org, email=email, status="pending").exists():
        return Response({"detail": "Invitation already sent"}, status=status.HTTP_400_BAD_REQUEST)

    invitation = Invitation.objects.create(
        organization=org,
        invited_by=request.user,
        email=email,
        role=role,
        expires_at=timezone.now() + timedelta(days=7),
    )

    invite_link = f"{django_settings.FRONTEND_URL}/invite/accept/{invitation.token}"
    send_invitation_email(email, org.name, invite_link)

    return Response(InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_member(request, org_id, user_id):
    """Remove a member. Owner only."""
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    caller = Membership.objects.filter(organization=org, user=request.user).first()
    if not caller or caller.role != "owner":
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    target = Membership.objects.filter(organization=org, user_id=user_id).first()
    if not target:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    if str(target.user_id) == str(request.user.id):
        return Response({"detail": "Cannot remove yourself"}, status=status.HTTP_400_BAD_REQUEST)
    target.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_member_role(request, org_id, user_id):
    """Change a member's role. Owner only."""
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    caller = Membership.objects.filter(organization=org, user=request.user).first()
    if not caller or caller.role != "owner":
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    role = request.data.get("role")
    if role not in ("admin", "member"):
        return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)
    target = Membership.objects.filter(organization=org, user_id=user_id).first()
    if not target:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    target.role = role
    target.save(update_fields=["role"])
    return Response(MemberSerializer(target).data)
```

Add a standalone view for accepting invitations. In `backend/organizations/views.py`:
```python
@api_view(["POST"])
@permission_classes([AllowAny])
def accept_invitation(request, token):
    """Accept an invitation by token."""
    try:
        invitation = Invitation.objects.get(token=token, status="pending")
    except Invitation.DoesNotExist:
        return Response({"detail": "Invalid or expired invitation"}, status=status.HTTP_404_NOT_FOUND)

    if invitation.expires_at < timezone.now():
        invitation.status = "expired"
        invitation.save(update_fields=["status"])
        return Response({"detail": "Invitation expired"}, status=status.HTTP_410_GONE)

    # If not authenticated, return invitation info for redirect
    if not request.user.is_authenticated:
        return Response({
            "requires_auth": True,
            "email": invitation.email,
            "organization_name": invitation.organization.name,
        })

    # Create membership
    if Membership.objects.filter(organization=invitation.organization, user=request.user).exists():
        return Response({"detail": "Already a member"}, status=status.HTTP_400_BAD_REQUEST)

    Membership.objects.create(
        organization=invitation.organization,
        user=request.user,
        role=invitation.role,
    )
    invitation.status = "accepted"
    invitation.save(update_fields=["status"])

    create_notification(
        organization=invitation.organization,
        recipient=request.user,
        type="invitation",
        title=f"Bienvenue dans {invitation.organization.name}",
        message=f"Vous avez rejoint l'organisation {invitation.organization.name}.",
        link="/settings/organization",
    )

    return Response({"status": "accepted", "organization": OrganizationSerializer(invitation.organization).data})
```

Add `AllowAny` to imports in the views file.

**Step 3: Update URLs**

Replace `backend/organizations/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path("", views.organization_list),
    path("<uuid:org_id>/members/", views.member_list),
    path("<uuid:org_id>/invite/", views.invite_member),
    path("<uuid:org_id>/members/<uuid:user_id>/", views.update_member_role),
    path("<uuid:org_id>/members/<uuid:user_id>/remove/", views.remove_member),
]
```

In `backend/config/urls.py`, add:
```python
path("api/invite/accept/<uuid:token>/", include("organizations.invite_urls")),
```

Create `backend/organizations/invite_urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path("", views.accept_invitation),
]
```

**Step 4: Commit**

```bash
git add backend/organizations/ backend/config/urls.py
git commit -m "feat: add invitation + members API endpoints"
```

---

## Task 10: Invitation + members tests

**Files:**
- Modify: `backend/organizations/tests.py` (add invitation tests)

**Step 1: Write tests**

Add to `backend/organizations/tests.py`:
```python
class InvitationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reg = self.client.post("/api/auth/register/", {
            "email": "owner@example.com",
            "password": "securepass123",
            "first_name": "Owner",
            "last_name": "User",
        })
        self.owner_token = reg.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_token}")
        self.owner = User.objects.get(email="owner@example.com")
        self.org = Organization.objects.filter(memberships__user=self.owner).first()

    def test_invite_member(self):
        response = self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "new@example.com", "role": "member"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "new@example.com")

    def test_list_members(self):
        response = self.client.get(f"/api/organizations/{self.org.id}/members/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["members"]), 1)
        self.assertEqual(response.data["members"][0]["role"], "owner")

    def test_accept_invitation(self):
        # Create invitation
        self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "new@example.com", "role": "member"},
        )
        invitation = Invitation.objects.get(email="new@example.com")

        # Register new user
        client2 = APIClient()
        reg2 = client2.post("/api/auth/register/", {
            "email": "new@example.com",
            "password": "securepass123",
            "first_name": "New",
            "last_name": "User",
        })
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {reg2.data['access']}")

        # Accept
        response = client2.post(f"/api/invite/accept/{invitation.token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "accepted")

    def test_duplicate_invite_rejected(self):
        self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "dup@example.com", "role": "member"},
        )
        response = self.client.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "dup@example.com", "role": "member"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_owner_cannot_invite(self):
        # Register second user
        client2 = APIClient()
        reg2 = client2.post("/api/auth/register/", {
            "email": "member@example.com",
            "password": "securepass123",
            "first_name": "Member",
            "last_name": "User",
        })
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {reg2.data['access']}")

        # Add as member
        user2 = User.objects.get(email="member@example.com")
        Membership.objects.create(organization=self.org, user=user2, role="member")

        # Try to invite — should fail
        response = client2.post(
            f"/api/organizations/{self.org.id}/invite/",
            {"email": "another@example.com", "role": "member"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

Add necessary imports at top:
```python
from organizations.models import Organization, Membership, Invitation
from django.contrib.auth import get_user_model
User = get_user_model()
```

**Step 2: Run tests**

Run: `cd backend && python manage.py test organizations -v 2`
Expected: All tests PASS (3 existing + 5 new).

**Step 3: Commit**

```bash
git add backend/organizations/tests.py
git commit -m "test: add invitation and members API tests"
```

---

## Task 11: Organization settings page (frontend)

**Files:**
- Create: `frontend/app/(app)/settings/organization/page.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx` (add link to organization settings)

**Step 1: Create organization settings page**

Create `frontend/app/(app)/settings/organization/page.tsx`:
```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Building2, UserPlus, Trash2, Loader2 } from "lucide-react"

interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  joined_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface MembersResponse {
  members: Member[]
  invitations: PendingInvitation[]
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<MembersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Get org id
  useEffect(() => {
    async function fetchOrg() {
      try {
        const orgs = await apiFetch<{ id: string; name: string }[]>("/organizations/")
        if (orgs.length > 0) setOrgId(orgs[0].id)
      } catch {
        // silently fail
      }
    }
    fetchOrg()
  }, [])

  const fetchMembers = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await apiFetch<MembersResponse>(`/organizations/${orgId}/members/`)
      setData(res)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setInviting(true)
    try {
      await apiFetch(`/organizations/${orgId}/invite/`, {
        method: "POST",
        json: { email: inviteEmail, role: inviteRole },
      })
      setInviteEmail("")
      setDialogOpen(false)
      fetchMembers()
    } catch (err) {
      console.error("Failed to invite:", err)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!orgId) return
    if (!confirm("Retirer ce membre de l'organisation ?")) return
    try {
      await apiFetch(`/organizations/${orgId}/members/${userId}/remove/`, {
        method: "DELETE",
      })
      fetchMembers()
    } catch (err) {
      console.error("Failed to remove:", err)
    }
  }

  const currentUserRole = data?.members.find(
    (m) => m.user_id === user?.id
  )?.role

  const isOwner = currentUserRole === "owner"

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Organisation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les membres de votre organisation
          </p>
        </div>
        {(isOwner || currentUserRole === "admin") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="membre@exemple.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Envoyer l&apos;invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Membres ({data?.members.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {data?.members.map((member) => {
                const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase()
                return (
                  <div key={member.user_id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member.user_id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {data?.invitations && data.invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Invitations en attente ({data.invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Rôle : {inv.role} · Envoyée le{" "}
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="outline">En attente</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Add link in settings page**

In `frontend/app/(app)/settings/page.tsx`, add a link card after the Pipeline card (before closing `</div>`):
```tsx
<Card>
  <CardContent className="p-0">
    <Link href="/settings/organization">
      <Button variant="ghost" className="w-full justify-between h-auto py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Organisation</p>
            <p className="text-xs text-muted-foreground">
              Gérer les membres et invitations
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Button>
    </Link>
  </CardContent>
</Card>
```

Import `Users` from lucide-react (already imported).

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/settings/organization/page.tsx frontend/app/\(app\)/settings/page.tsx
git commit -m "feat: add organization settings page with member management"
```

---

## Task 12: Invitation acceptance page (frontend)

**Files:**
- Create: `frontend/app/invite/accept/[token]/page.tsx`

**Step 1: Create the page**

Create `frontend/app/invite/accept/[token]/page.tsx`:
```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "needs_auth" | "accepted" | "error">("loading")
  const [orgName, setOrgName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (authLoading) return

    async function accept() {
      try {
        const data = await apiFetch<Record<string, unknown>>(`/invite/accept/${token}/`, {
          method: "POST",
        })
        if (data.requires_auth) {
          setOrgName(data.organization_name as string)
          setInviteEmail(data.email as string)
          setStatus("needs_auth")
        } else if (data.status === "accepted") {
          setOrgName((data.organization as Record<string, string>)?.name ?? "")
          setStatus("accepted")
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "L'invitation est invalide ou a expiré."
        )
        setStatus("error")
      }
    }

    accept()
  }, [token, authLoading, user])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Qeylo</span>
            </div>
          </div>
          <CardTitle className="text-xl">Invitation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">Vérification...</p>
            </div>
          )}

          {status === "needs_auth" && (
            <>
              <CardDescription>
                Vous êtes invité(e) à rejoindre <strong>{orgName}</strong>.
                Connectez-vous ou créez un compte pour accepter.
              </CardDescription>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href={`/login?redirect=/invite/accept/${token}`}>
                    Se connecter
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/register?email=${encodeURIComponent(inviteEmail)}&invite=${token}`}>
                    Créer un compte
                  </Link>
                </Button>
              </div>
            </>
          )}

          {status === "accepted" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-sm">
                Vous avez rejoint <strong>{orgName}</strong> avec succès !
              </p>
              <Button onClick={() => router.push("/chat")}>
                Aller au chat
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" asChild>
                <Link href="/">Retour à l&apos;accueil</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/invite/
git commit -m "feat: add invitation acceptance page"
```

---

## Task 13: Auto-accept invitation after register

**Files:**
- Modify: `backend/accounts/views.py:17-47` (register view)

**Step 1: Update register to auto-accept pending invitations**

In `backend/accounts/views.py`, after the user and org are created (line 40), add:
```python
# Auto-accept pending invitations for this email
from organizations.models import Invitation
pending = Invitation.objects.filter(email=user.email, status="pending")
for invitation in pending:
    if invitation.expires_at >= timezone.now():
        Membership.objects.create(
            organization=invitation.organization,
            user=user,
            role=invitation.role,
        )
        invitation.status = "accepted"
        invitation.save(update_fields=["status"])
```

Add `from django.utils import timezone` at the top of the file.

**Step 2: Commit**

```bash
git add backend/accounts/views.py
git commit -m "feat: auto-accept pending invitations on register"
```

---

## Task 14: Automatic reminders management command

**Files:**
- Create: `backend/notifications/management/__init__.py`
- Create: `backend/notifications/management/commands/__init__.py`
- Create: `backend/notifications/management/commands/check_reminders.py`

**Step 1: Create directory structure**

Create empty `__init__.py` files in `backend/notifications/management/` and `backend/notifications/management/commands/`.

**Step 2: Write the management command**

Create `backend/notifications/management/commands/check_reminders.py`:
```python
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from organizations.models import Organization, Membership
from deals.models import Deal
from tasks.models import Task
from contacts.models import Contact
from notes.models import TimelineEntry
from notifications.models import Notification
from notifications.helpers import create_notification
from notifications.email import send_reminder_email


class Command(BaseCommand):
    help = "Check for deals, tasks, and contacts that need reminders"

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()
        total_created = 0

        for org in Organization.objects.all():
            members = Membership.objects.filter(organization=org).select_related("user")

            for membership in members:
                user = membership.user
                reminders = []

                # Rule 1: Inactive deals (no timeline entry in 7 days)
                active_deals = Deal.objects.filter(
                    organization=org,
                ).exclude(stage__name__in=["Gagné", "Perdu"])

                for deal in active_deals:
                    last_entry = TimelineEntry.objects.filter(
                        organization=org, deal=deal,
                    ).order_by("-created_at").first()
                    cutoff = now - timedelta(days=7)
                    is_inactive = (
                        not last_entry or last_entry.created_at < cutoff
                    )
                    if is_inactive and not self._has_unread(
                        org, user, "reminder", f"deal-inactive-{deal.id}"
                    ):
                        n = create_notification(
                            organization=org,
                            recipient=user,
                            type="reminder",
                            title=f"Deal inactif : {deal.name}",
                            message=f"Le deal « {deal.name} » n'a pas eu d'activité depuis 7 jours.",
                            link=f"/deals",
                        )
                        reminders.append({"title": n.title, "message": n.message})
                        total_created += 1

                # Rule 2: Overdue tasks
                overdue_tasks = Task.objects.filter(
                    organization=org, is_done=False, due_date__lt=now,
                )
                for task in overdue_tasks:
                    if not self._has_unread(
                        org, user, "task_due", f"task-overdue-{task.id}"
                    ):
                        n = create_notification(
                            organization=org,
                            recipient=user,
                            type="task_due",
                            title="Tâche en retard",
                            message=f"La tâche « {task.description} » est en retard.",
                            link="/tasks",
                        )
                        reminders.append({"title": n.title, "message": n.message})
                        total_created += 1

                # Rule 3: Tasks due today
                tasks_today = Task.objects.filter(
                    organization=org,
                    is_done=False,
                    due_date__date=today,
                )
                for task in tasks_today:
                    if not self._has_unread(
                        org, user, "task_due", f"task-today-{task.id}"
                    ):
                        n = create_notification(
                            organization=org,
                            recipient=user,
                            type="task_due",
                            title="Rappel",
                            message=f"La tâche « {task.description} » est prévue pour aujourd'hui.",
                            link="/tasks",
                        )
                        reminders.append({"title": n.title, "message": n.message})
                        total_created += 1

                # Rule 4: Contacts without follow-up (30 days)
                cutoff_30 = now - timedelta(days=30)
                contacts = Contact.objects.filter(organization=org)
                for contact in contacts:
                    last = TimelineEntry.objects.filter(
                        organization=org, contact=contact,
                    ).order_by("-created_at").first()
                    if last and last.created_at < cutoff_30:
                        if not self._has_unread(
                            org, user, "reminder", f"contact-inactive-{contact.id}"
                        ):
                            name = f"{contact.first_name} {contact.last_name}"
                            n = create_notification(
                                organization=org,
                                recipient=user,
                                type="reminder",
                                title=f"Contact sans suivi : {name}",
                                message=f"Vous n'avez pas eu de contact avec {name} depuis 30 jours.",
                                link=f"/contacts/{contact.id}",
                            )
                            reminders.append({"title": n.title, "message": n.message})
                            total_created += 1

                # Send email digest if any reminders and user wants emails
                if reminders and getattr(user, "email_notifications", True):
                    send_reminder_email(user.email, reminders)

        self.stdout.write(
            self.style.SUCCESS(f"Created {total_created} reminder notifications.")
        )

    def _has_unread(self, org, user, notif_type, key):
        """Check if an unread notification with similar content exists (anti-duplicate)."""
        return Notification.objects.filter(
            organization=org,
            recipient=user,
            type=notif_type,
            is_read=False,
            link__contains=key.split("-")[-1] if "-" in key else "",
        ).exists()
```

**Step 3: Run and test**

Run: `cd backend && python manage.py check_reminders`
Expected: "Created 0 reminder notifications." (no data yet, but no errors)

**Step 4: Commit**

```bash
git add backend/notifications/management/
git commit -m "feat: add check_reminders management command for automatic reminders"
```

---

## Task 15: Reminders tests

**Files:**
- Add tests in `backend/notifications/tests.py`

**Step 1: Add reminder tests**

Add a new test class to `backend/notifications/tests.py`:
```python
from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from deals.models import Deal, PipelineStage
from tasks.models import Task
from contacts.models import Contact
from notes.models import TimelineEntry


class ReminderTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reg = self.client.post("/api/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "first_name": "Test",
            "last_name": "User",
        })
        self.token = reg.data["access"]
        self.user = User.objects.get(email="test@example.com")
        self.org = Organization.objects.filter(memberships__user=self.user).first()

    def test_overdue_task_creates_notification(self):
        Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Overdue task",
            due_date=timezone.now() - timedelta(days=1),
            priority="high",
        )
        call_command("check_reminders")
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, type="task_due").count(),
            1,
        )

    def test_task_due_today_creates_notification(self):
        Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Today task",
            due_date=timezone.now(),
            priority="normal",
        )
        call_command("check_reminders")
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.user, message__contains="Today task"
            ).exists()
        )

    def test_no_duplicate_reminders(self):
        Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Overdue task",
            due_date=timezone.now() - timedelta(days=1),
            priority="high",
        )
        call_command("check_reminders")
        call_command("check_reminders")
        # Should not create duplicate
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, type="task_due").count(),
            1,
        )
```

**Step 2: Run tests**

Run: `cd backend && python manage.py test notifications -v 2`
Expected: All tests PASS (6 notification + 3 reminder = 9 total).

**Step 3: Commit**

```bash
git add backend/notifications/tests.py
git commit -m "test: add reminder management command tests"
```

---

## Task 16: CSV import backend (preview + import endpoints)

**Files:**
- Create: `backend/contacts/import_views.py`
- Create: `backend/contacts/import_urls.py`
- Modify: `backend/config/urls.py` (add import route)

**Step 1: Write import views**

Create `backend/contacts/import_views.py`:
```python
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
```

**Step 2: Create URL file**

Create `backend/contacts/import_urls.py`:
```python
from django.urls import path
from . import import_views

urlpatterns = [
    path("preview/", import_views.import_preview),
    path("", import_views.import_contacts),
]
```

**Step 3: Add to main URLs**

In `backend/config/urls.py`, add:
```python
path("api/contacts/import/", include("contacts.import_urls")),
```

Add it BEFORE the `api/contacts/` line (so the more specific path matches first).

**Step 4: Commit**

```bash
git add backend/contacts/import_views.py backend/contacts/import_urls.py backend/config/urls.py
git commit -m "feat: add CSV import preview and import API endpoints"
```

---

## Task 17: CSV import tests

**Files:**
- Modify: `backend/contacts/tests.py` (add import tests)

**Step 1: Add import tests**

Add to `backend/contacts/tests.py`:
```python
import io

class CSVImportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reg = self.client.post("/api/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "first_name": "Test",
            "last_name": "User",
        })
        self.token = reg.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def _make_csv(self, content: str):
        return io.BytesIO(content.encode("utf-8"))

    def test_import_preview(self):
        csv_content = "prénom,nom,email\nMarie,Dupont,marie@example.com\nJean,Martin,jean@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/preview/",
            {"file": f},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("headers", response.data)
        self.assertIn("suggested_mapping", response.data)
        self.assertEqual(response.data["total_rows"], 2)
        # Auto-detect mapping
        self.assertEqual(response.data["suggested_mapping"]["prénom"], "first_name")

    def test_import_contacts(self):
        csv_content = "first_name,last_name,email\nMarie,Dupont,marie@example.com\nJean,Martin,jean@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        import json
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "last_name": "last_name",
                    "email": "email",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(response.data["skipped"], 0)

    def test_import_skips_duplicates(self):
        # Create existing contact
        from contacts.models import Contact
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()
        Contact.objects.create(
            organization=org, created_by=user,
            first_name="Marie", last_name="Dupont", email="marie@example.com",
        )

        csv_content = "first_name,last_name,email\nMarie,Dupont,marie@example.com\nJean,Martin,jean@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        import json
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "last_name": "last_name",
                    "email": "email",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(response.data["skipped"], 1)
```

**Step 2: Run tests**

Run: `cd backend && python manage.py test contacts -v 2`
Expected: All tests PASS (6 existing + 3 import = 9 total).

**Step 3: Commit**

```bash
git add backend/contacts/tests.py
git commit -m "test: add CSV import endpoint tests"
```

---

## Task 18: CSV import dialog (frontend)

**Files:**
- Create: `frontend/components/contacts/ImportCSVDialog.tsx`
- Modify: `frontend/app/(app)/contacts/page.tsx` (add import button)

**Step 1: Create ImportCSVDialog component**

Create `frontend/components/contacts/ImportCSVDialog.tsx`:
```tsx
"use client"

import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"

const CONTACT_FIELDS = [
  { value: "", label: "— Ignorer —" },
  { value: "first_name", label: "Prénom" },
  { value: "last_name", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
  { value: "company", label: "Entreprise" },
  { value: "source", label: "Source" },
]

interface PreviewData {
  headers: string[]
  preview: Record<string, string>[]
  suggested_mapping: Record<string, string>
  total_rows: number
}

interface ImportResult {
  created: number
  skipped: number
  errors: string[]
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
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importer CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Importer des contacts
            {step < 3 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
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
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-12 cursor-pointer hover:border-primary/40 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Glissez votre fichier CSV ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Max 5 MB · 1000 contacts max
                  </p>
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {preview.total_rows} lignes détectées. Associez les colonnes aux champs contact.
            </p>

            {/* Mapping selectors */}
            <div className="space-y-2">
              {preview.headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium">
                    {header}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    value={mapping[header] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [header]: e.target.value })
                    }
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">
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
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-semibold">
                {result.created} contacts importés
              </p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground">
                  {result.skipped} doublons ignorés
                </p>
              )}
              {result.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {result.errors.length} erreurs
                </p>
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

**Step 2: Add import button to contacts page**

In `frontend/app/(app)/contacts/page.tsx`, add import for the dialog:
```tsx
import { ImportCSVDialog } from "@/components/contacts/ImportCSVDialog"
```

Then in the header area (around line 124-130), next to the "Ajouter" dialog trigger, add:
```tsx
<div className="flex gap-2">
  <ImportCSVDialog onImported={fetchContacts} />
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    ...existing dialog trigger and content...
  </Dialog>
</div>
```

**Step 3: Commit**

```bash
git add frontend/components/contacts/ImportCSVDialog.tsx frontend/app/\(app\)/contacts/page.tsx
git commit -m "feat: add CSV import dialog in contacts page"
```

---

## Task 19: Run all tests and verify build

**Step 1: Run all backend tests**

Run: `cd backend && python manage.py test -v 2`
Expected: All tests PASS (30+ existing + new notification/invitation/import tests).

**Step 2: Run frontend build**

Run: `cd frontend && npx next build`
Expected: Build succeeds with all routes compiled.

**Step 3: Commit any fixes if needed**

---

## Summary

| Task | Feature | Type |
|------|---------|------|
| 1-3 | Notifications in-app | Backend model + API + tests |
| 4 | Notification bell | Frontend |
| 5-6 | Email via Resend | Backend model change + service |
| 7 | Email toggle | Frontend + backend PATCH |
| 8-10 | Invitation de membres | Backend model + API + tests |
| 11-12 | Invitation pages | Frontend |
| 13 | Auto-accept on register | Backend |
| 14-15 | Rappels automatiques | Backend command + tests |
| 16-17 | Import CSV | Backend API + tests |
| 18 | Import CSV dialog | Frontend |
| 19 | Final verification | Tests + build |
