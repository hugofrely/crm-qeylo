# Global Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a unified search bar in a sticky top header that searches across contacts, deals, and tasks via a single backend endpoint.

**Architecture:** A single `GET /api/search/?q=` endpoint fans out to Contact, Deal, and Task models using Django Q objects, returning grouped results capped at 5 per category. Frontend adds a `SearchHeader` component with debounced input and dropdown results, integrated into the app layout above `<main>`.

**Tech Stack:** Django REST Framework, Next.js 16, React 19, Tailwind CSS 4, lucide-react

---

### Task 1: Backend — Global search endpoint

**Files:**
- Create: `backend/search/__init__.py`
- Create: `backend/search/apps.py`
- Create: `backend/search/views.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/config/settings.py`

**Context:**
- `request.organization` is set by middleware on all authenticated requests (see `contacts/views.py:43` for usage pattern)
- The existing `search_contacts` in `contacts/views.py:39-52` uses `Q()` OR-chaining with `icontains` per word — we reuse this pattern
- Models: `Contact` (fields: `first_name`, `last_name`, `company`, `email`), `Deal` (fields: `name`, `notes`, FK `contact`, FK `stage`), `Task` (fields: `description`, FK `contact`, FK `deal`)

**Step 1: Create the search app scaffold**

Create `backend/search/__init__.py` (empty file).

Create `backend/search/apps.py`:

```python
from django.apps import AppConfig


class SearchConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "search"
```

**Step 2: Write the search view**

Create `backend/search/views.py`:

```python
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task

MAX_RESULTS = 5


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def global_search(request):
    q = request.query_params.get("q", "").strip()
    if len(q) < 2:
        return Response({"contacts": [], "deals": [], "tasks": []})

    org = request.organization
    words = q.split()

    # --- Contacts ---
    contacts_qs = Contact.objects.filter(organization=org)
    for word in words:
        contacts_qs = contacts_qs.filter(
            Q(first_name__icontains=word)
            | Q(last_name__icontains=word)
            | Q(company__icontains=word)
            | Q(email__icontains=word)
        )
    contacts = [
        {
            "id": str(c.id),
            "first_name": c.first_name,
            "last_name": c.last_name,
            "company": c.company,
            "email": c.email,
        }
        for c in contacts_qs[:MAX_RESULTS]
    ]

    # --- Deals ---
    deals_qs = Deal.objects.filter(organization=org).select_related("stage", "contact")
    for word in words:
        deals_qs = deals_qs.filter(
            Q(name__icontains=word)
            | Q(notes__icontains=word)
            | Q(contact__first_name__icontains=word)
            | Q(contact__last_name__icontains=word)
        )
    deals = [
        {
            "id": str(d.id),
            "name": d.name,
            "amount": str(d.amount),
            "stage_name": d.stage.name if d.stage else "",
            "contact_name": f"{d.contact.first_name} {d.contact.last_name}".strip() if d.contact else "",
        }
        for d in deals_qs[:MAX_RESULTS]
    ]

    # --- Tasks ---
    tasks_qs = Task.objects.filter(organization=org).select_related("contact", "deal")
    for word in words:
        tasks_qs = tasks_qs.filter(
            Q(description__icontains=word)
            | Q(contact__first_name__icontains=word)
            | Q(contact__last_name__icontains=word)
            | Q(deal__name__icontains=word)
        )
    tasks = [
        {
            "id": str(t.id),
            "description": t.description,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "is_done": t.is_done,
            "contact_name": f"{t.contact.first_name} {t.contact.last_name}".strip() if t.contact else "",
        }
        for t in tasks_qs[:MAX_RESULTS]
    ]

    return Response({"contacts": contacts, "deals": deals, "tasks": tasks})
```

**Step 3: Register the URL and app**

Add to `backend/config/settings.py` in the `INSTALLED_APPS` list:

```python
"search",
```

Add to `backend/config/urls.py` (before the closing bracket, after the email line):

```python
path("api/search/", include("search.urls")),
```

Create `backend/search/urls.py`:

```python
from django.urls import path
from .views import global_search

urlpatterns = [
    path("", global_search, name="global-search"),
]
```

**Step 4: Run the dev server to verify no import errors**

Run: `docker compose exec backend python manage.py check`
Expected: `System check identified no issues.`

**Step 5: Commit**

```bash
git add backend/search/ backend/config/urls.py backend/config/settings.py
git commit -m "feat: add global search endpoint GET /api/search/?q="
```

---

### Task 2: Backend — Tests for global search

**Files:**
- Create: `backend/search/tests.py`

**Context:**
- Tests in this project use Django REST Framework's `APITestCase`
- The `Organization` model requires a `name` and `slug` field (see existing tests for pattern)
- `PipelineStage` is required for `Deal` creation (FK, `on_delete=PROTECT`)
- `request.organization` is set by middleware based on the user's org membership
- Auth is JWT-based: use `self.client.force_authenticate(user=self.user)`

**Step 1: Write tests**

Create `backend/search/tests.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization
from contacts.models import Contact
from deals.models import Deal, PipelineStage
from tasks.models import Task


class GlobalSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.user = User.objects.create_user(
            email="test@example.com", password="testpass123"
        )
        self.org.members.add(self.user)
        self.client.force_authenticate(user=self.user)

        self.contact = Contact.objects.create(
            organization=self.org,
            created_by=self.user,
            first_name="Jean",
            last_name="Dupont",
            company="Acme",
            email="jean@acme.com",
        )
        self.stage = PipelineStage.objects.create(
            organization=self.org, name="Negociation", order=1
        )
        self.deal = Deal.objects.create(
            organization=self.org,
            created_by=self.user,
            name="Contrat Acme",
            amount=50000,
            stage=self.stage,
            contact=self.contact,
        )
        self.task = Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Rappeler Jean Dupont",
            due_date="2026-03-10T10:00:00Z",
            contact=self.contact,
        )

    def test_search_requires_auth(self):
        self.client.logout()
        resp = self.client.get("/api/search/?q=jean")
        self.assertEqual(resp.status_code, 401)

    def test_search_short_query_returns_empty(self):
        resp = self.client.get("/api/search/?q=j")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["contacts"], [])
        self.assertEqual(data["deals"], [])
        self.assertEqual(data["tasks"], [])

    def test_search_contacts_by_name(self):
        resp = self.client.get("/api/search/?q=jean")
        data = resp.json()
        self.assertEqual(len(data["contacts"]), 1)
        self.assertEqual(data["contacts"][0]["first_name"], "Jean")

    def test_search_contacts_by_company(self):
        resp = self.client.get("/api/search/?q=acme")
        data = resp.json()
        self.assertGreaterEqual(len(data["contacts"]), 1)

    def test_search_deals_by_name(self):
        resp = self.client.get("/api/search/?q=contrat")
        data = resp.json()
        self.assertEqual(len(data["deals"]), 1)
        self.assertEqual(data["deals"][0]["name"], "Contrat Acme")

    def test_search_deals_by_contact_name(self):
        resp = self.client.get("/api/search/?q=dupont")
        data = resp.json()
        self.assertGreaterEqual(len(data["deals"]), 1)

    def test_search_tasks_by_description(self):
        resp = self.client.get("/api/search/?q=rappeler")
        data = resp.json()
        self.assertEqual(len(data["tasks"]), 1)
        self.assertEqual(data["tasks"][0]["description"], "Rappeler Jean Dupont")

    def test_search_tasks_by_contact_name(self):
        resp = self.client.get("/api/search/?q=jean")
        data = resp.json()
        self.assertGreaterEqual(len(data["tasks"]), 1)

    def test_search_multi_word(self):
        resp = self.client.get("/api/search/?q=jean acme")
        data = resp.json()
        # Jean Dupont at Acme should match contacts
        self.assertGreaterEqual(len(data["contacts"]), 1)

    def test_search_cross_entity(self):
        resp = self.client.get("/api/search/?q=jean")
        data = resp.json()
        # "jean" should match across contacts, deals (via contact), and tasks
        self.assertGreaterEqual(len(data["contacts"]), 1)
        self.assertGreaterEqual(len(data["deals"]), 1)
        self.assertGreaterEqual(len(data["tasks"]), 1)

    def test_search_max_results(self):
        # Create 10 contacts to verify limit
        for i in range(10):
            Contact.objects.create(
                organization=self.org,
                created_by=self.user,
                first_name=f"Test{i}",
                last_name="Bulk",
                email=f"test{i}@bulk.com",
            )
        resp = self.client.get("/api/search/?q=bulk")
        data = resp.json()
        self.assertLessEqual(len(data["contacts"]), 5)

    def test_search_org_isolation(self):
        other_org = Organization.objects.create(name="Other", slug="other")
        Contact.objects.create(
            organization=other_org,
            first_name="Secret",
            last_name="Contact",
            email="secret@other.com",
        )
        resp = self.client.get("/api/search/?q=secret")
        data = resp.json()
        self.assertEqual(len(data["contacts"]), 0)
```

**Step 2: Run the tests**

Run: `docker compose exec backend python manage.py test search -v2`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add backend/search/tests.py
git commit -m "test: add global search endpoint tests"
```

---

### Task 3: Frontend — SearchHeader component

**Files:**
- Create: `frontend/components/SearchHeader.tsx`

**Context:**
- `apiFetch` is in `frontend/lib/api.ts` — call `apiFetch<SearchResults>("/search/?q=...")` to hit the backend
- The `NotificationBell` component is in `frontend/components/NotificationBell.tsx` — it will be moved from the Sidebar into this header
- Use `useRouter` from `next/navigation` for programmatic navigation
- Use lucide-react icons already installed: `Search`, `Users`, `Kanban`, `CheckSquare`, `X`
- Debounce pattern: 300ms setTimeout with cleanup ref (same as `DealDialog.tsx` pattern)
- Use existing CSS variables and Tailwind classes consistent with the rest of the app
- The header should be sticky and full-width above the page content

**Step 1: Create the SearchHeader component**

Create `frontend/components/SearchHeader.tsx`:

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, Kanban, CheckSquare, X } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { NotificationBell } from "@/components/NotificationBell"

interface ContactResult {
  id: string
  first_name: string
  last_name: string
  company: string
  email: string
}

interface DealResult {
  id: string
  name: string
  amount: string
  stage_name: string
  contact_name: string
}

interface TaskResult {
  id: string
  description: string
  priority: string
  due_date: string | null
  is_done: boolean
  contact_name: string
}

interface SearchResults {
  contacts: ContactResult[]
  deals: DealResult[]
  tasks: TaskResult[]
}

export function SearchHeader() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<SearchResults>(`/search/?q=${encodeURIComponent(q.trim())}`)
      setResults(data)
      const hasResults =
        data.contacts.length > 0 || data.deals.length > 0 || data.tasks.length > 0
      setOpen(true)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const navigate = (path: string) => {
    setOpen(false)
    setQuery("")
    setResults(null)
    router.push(path)
  }

  const hasResults = results &&
    (results.contacts.length > 0 || results.deals.length > 0 || results.tasks.length > 0)
  const noResults = results && !hasResults && query.trim().length >= 2

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-6 py-3">
        {/* Search input */}
        <div ref={containerRef} className="relative flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results && query.trim().length >= 2) setOpen(true)
              }}
              placeholder="Rechercher contacts, deals, tâches..."
              className="w-full rounded-lg border border-border bg-secondary/30 py-2 pl-10 pr-10 text-sm font-[family-name:var(--font-body)] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("")
                  setResults(null)
                  setOpen(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Kbd hint */}
            {!query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40 font-[family-name:var(--font-body)]">
                <kbd className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px]">⌘</kbd>
                <kbd className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px]">K</kbd>
              </span>
            )}
          </div>

          {/* Results dropdown */}
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-fade-in-up z-50">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <span className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                    Recherche...
                  </span>
                </div>
              )}

              {!loading && noResults && (
                <div className="flex items-center justify-center py-6">
                  <span className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                    Aucun résultat pour &quot;{query.trim()}&quot;
                  </span>
                </div>
              )}

              {!loading && hasResults && (
                <div className="max-h-80 overflow-y-auto">
                  {/* Contacts */}
                  {results.contacts.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                        Contacts
                      </div>
                      {results.contacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/contacts/${c.id}`)}
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate font-[family-name:var(--font-body)]">
                              {c.first_name} {c.last_name}
                            </p>
                            {c.company && (
                              <p className="text-[11px] text-muted-foreground truncate font-[family-name:var(--font-body)]">
                                {c.company}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Deals */}
                  {results.deals.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] border-t border-border/50">
                        Pipeline
                      </div>
                      {results.deals.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => navigate("/deals")}
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                          <Kanban className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate font-[family-name:var(--font-body)]">
                              {d.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate font-[family-name:var(--font-body)]">
                              {d.stage_name}{d.contact_name ? ` · ${d.contact_name}` : ""}
                              {Number(d.amount) > 0 ? ` · ${Number(d.amount).toLocaleString("fr-FR")} €` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tasks */}
                  {results.tasks.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] border-t border-border/50">
                        Tâches
                      </div>
                      {results.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => navigate("/tasks")}
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                          <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate font-[family-name:var(--font-body)]">
                              {t.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate font-[family-name:var(--font-body)]">
                              {t.priority === "high" ? "Haute" : t.priority === "low" ? "Basse" : "Normale"}
                              {t.contact_name ? ` · ${t.contact_name}` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <NotificationBell />
      </div>
    </div>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `SearchHeader.tsx`

**Step 3: Commit**

```bash
git add frontend/components/SearchHeader.tsx
git commit -m "feat: add SearchHeader component with debounced global search"
```

---

### Task 4: Frontend — Integrate SearchHeader into layout and clean up Sidebar

**Files:**
- Modify: `frontend/app/(app)/layout.tsx`
- Modify: `frontend/components/Sidebar.tsx`

**Context:**
- Current layout (`layout.tsx`): `<div flex> <Sidebar /> <main> {children} </main> </div>`
- Target layout: `<div flex> <Sidebar /> <div flex-col flex-1> <SearchHeader /> <main> {children} </main> </div> </div>`
- The `NotificationBell` is currently rendered in `Sidebar.tsx` line 83 — it needs to be removed from there since it's now in `SearchHeader`

**Step 1: Update the app layout**

Replace the content of `frontend/app/(app)/layout.tsx`:

In the return statement, change:

```tsx
<div className="min-h-screen flex bg-background">
  <Sidebar />
  <main className="flex-1 overflow-auto lg:ml-0">{children}</main>
</div>
```

to:

```tsx
<div className="min-h-screen flex bg-background">
  <Sidebar />
  <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
    <SearchHeader />
    <main className="flex-1 overflow-auto">{children}</main>
  </div>
</div>
```

Add the import at the top:

```tsx
import { SearchHeader } from "@/components/SearchHeader"
```

**Step 2: Remove NotificationBell from Sidebar**

In `frontend/components/Sidebar.tsx`:

Remove the import line:
```tsx
import { NotificationBell } from "@/components/NotificationBell"
```

Replace line 83 (the `<NotificationBell />` in the logo area):
```tsx
<NotificationBell />
```
with nothing — just remove it. The logo area `<div>` with `justify-between` can be changed to not need justify-between since there's only the logo now. Change:

```tsx
<div className="flex h-[72px] items-center justify-between px-6">
```

to:

```tsx
<div className="flex h-[72px] items-center px-6">
```

**Step 3: Verify the app compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/layout.tsx frontend/components/Sidebar.tsx
git commit -m "feat: integrate SearchHeader into app layout, move NotificationBell from sidebar to header"
```

---

### Task 5: Integration testing — End-to-end verification

**Files:** None (verification only)

**Step 1: Run backend tests**

Run: `docker compose exec backend python manage.py test search -v2`
Expected: All tests PASS

**Step 2: Run frontend TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Manual smoke test**

1. Open `http://localhost:3000` — verify the search bar appears in a sticky header above the page content
2. The NotificationBell should be in the header (right side), not in the sidebar
3. Type "jean" in the search bar — after 300ms debounce, results should appear grouped by Contacts / Pipeline / Taches
4. Click a contact result — should navigate to `/contacts/{id}`
5. Press `Cmd+K` — search bar should focus
6. Press `Escape` — dropdown should close
7. Type a single character — no API call (minimum 2 chars)
8. Search for something that doesn't exist — "Aucun resultat" message

**Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address integration test feedback for global search"
```
