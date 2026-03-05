# Organization Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to switch organizations from the sidebar, create new organizations, and name their organization at registration.

**Architecture:** Add an OrganizationProvider React context that manages the current org and injects the `X-Organization` header into all API calls. Modify the sidebar to include an org switcher dropdown. Add an `organization_name` field to registration.

**Tech Stack:** Next.js, React Context, shadcn/ui (DropdownMenu, Dialog), Django REST Framework, js-cookie

---

### Task 1: Backend — Add `organization_name` to registration

**Files:**
- Modify: `backend/accounts/serializers.py:7-16`
- Modify: `backend/accounts/views.py:18-60`
- Test: `backend/accounts/tests.py`

**Step 1: Write the failing test**

Add to `backend/accounts/tests.py`:

```python
def test_register_uses_organization_name(self):
    response = self.client.post("/api/auth/register/", {
        "email": "org@example.com",
        "password": "securepass123",
        "first_name": "Hugo",
        "last_name": "Frely",
        "organization_name": "Mon Entreprise",
    })
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    # Verify the org was created with the given name
    from organizations.models import Organization, Membership
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.get(email="org@example.com")
    membership = Membership.objects.get(user=user, role="owner")
    self.assertEqual(membership.organization.name, "Mon Entreprise")

def test_register_requires_organization_name(self):
    response = self.client.post("/api/auth/register/", {
        "email": "noorg@example.com",
        "password": "securepass123",
        "first_name": "Hugo",
        "last_name": "Frely",
    })
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test accounts.tests.AuthTests.test_register_uses_organization_name accounts.tests.AuthTests.test_register_requires_organization_name -v2`
Expected: FAIL — `organization_name` is not a recognized field, and registration without it still succeeds.

**Step 3: Add `organization_name` to RegisterSerializer**

Edit `backend/accounts/serializers.py` — add the field to `RegisterSerializer`:

```python
class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    organization_name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
```

**Step 4: Use `organization_name` in the register view**

Edit `backend/accounts/views.py` — replace the hardcoded workspace name (lines 32-35):

```python
# Create personal organization
org = Organization.objects.create(
    name=data["organization_name"],
    slug=f"user-{user.id.hex[:8]}",
)
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && python manage.py test accounts -v2`
Expected: ALL PASS. The existing `test_register_creates_user_and_org` will now fail because it doesn't send `organization_name`. Fix it:

Update the existing test payloads in `backend/accounts/tests.py` to include `"organization_name": "Test Workspace"` in every `register` call. There are 5 register calls in existing tests (lines 11, 24, 39, 53, 66).

**Step 6: Run all tests again**

Run: `cd backend && python manage.py test accounts -v2`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/accounts/serializers.py backend/accounts/views.py backend/accounts/tests.py
git commit -m "feat(auth): require organization_name at registration"
```

---

### Task 2: Frontend — Add `Organization` type and org service

**Files:**
- Modify: `frontend/types/auth.ts`
- Create: `frontend/services/organizations.ts`

**Step 1: Add Organization type**

Add to `frontend/types/auth.ts` (or the main types file if there's a separate `frontend/types/index.ts`):

```typescript
export interface Organization {
  id: string
  name: string
  slug: string
  siret: string
  logo_url: string
  created_at: string
}
```

**Step 2: Create organization service**

Create `frontend/services/organizations.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { Organization } from "@/types"

export async function fetchOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/organizations/")
}

export async function createOrganization(name: string): Promise<Organization> {
  return apiFetch<Organization>("/organizations/", {
    method: "POST",
    json: { name },
  })
}
```

**Step 3: Commit**

```bash
git add frontend/types/auth.ts frontend/services/organizations.ts
git commit -m "feat(org): add Organization type and service"
```

---

### Task 3: Frontend — Create OrganizationProvider context

**Files:**
- Create: `frontend/lib/organization.tsx`
- Modify: `frontend/lib/api.ts:14-21`
- Modify: `frontend/app/(app)/layout.tsx:29-37`

**Step 1: Create OrganizationProvider**

Create `frontend/lib/organization.tsx`:

```tsx
"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import Cookies from "js-cookie"
import type { Organization } from "@/types"
import { fetchOrganizations, createOrganization as createOrgApi } from "@/services/organizations"

interface OrganizationContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  orgVersion: number
  switchOrganization: (orgId: string) => void
  createOrganization: (name: string) => Promise<Organization>
  loading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [orgVersion, setOrgVersion] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrganizations()
      .then((orgs) => {
        setOrganizations(orgs)
        const savedId = Cookies.get("organization_id")
        const saved = orgs.find((o) => o.id === savedId)
        const selected = saved || orgs[0] || null
        setCurrentOrganization(selected)
        if (selected) Cookies.set("organization_id", selected.id, { expires: 365 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const switchOrganization = useCallback(
    (orgId: string) => {
      const org = organizations.find((o) => o.id === orgId)
      if (org) {
        setCurrentOrganization(org)
        Cookies.set("organization_id", org.id, { expires: 365 })
        setOrgVersion((v) => v + 1)
      }
    },
    [organizations]
  )

  const createOrganization = useCallback(async (name: string) => {
    const org = await createOrgApi(name)
    setOrganizations((prev) => [...prev, org])
    setCurrentOrganization(org)
    Cookies.set("organization_id", org.id, { expires: 365 })
    setOrgVersion((v) => v + 1)
    return org
  }, [])

  return (
    <OrganizationContext.Provider
      value={{ organizations, currentOrganization, orgVersion, switchOrganization, createOrganization, loading }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) throw new Error("useOrganization must be used within OrganizationProvider")
  return context
}
```

**Step 2: Inject `X-Organization` header in apiFetch**

Edit `frontend/lib/api.ts`. After line 20 (after setting Authorization header), add:

```typescript
const orgId = Cookies.get("organization_id")
if (orgId) {
  headers["X-Organization"] = orgId
}
```

**Step 3: Wrap app layout with OrganizationProvider**

Edit `frontend/app/(app)/layout.tsx`. Import and wrap:

```tsx
import { OrganizationProvider } from "@/lib/organization"

// In the return, wrap the content:
return (
  <OrganizationProvider>
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <SearchHeader />
        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  </OrganizationProvider>
)
```

**Step 4: Commit**

```bash
git add frontend/lib/organization.tsx frontend/lib/api.ts frontend/app/(app)/layout.tsx
git commit -m "feat(org): add OrganizationProvider context and X-Organization header"
```

---

### Task 4: Frontend — Add org switcher to Sidebar

**Files:**
- Modify: `frontend/components/Sidebar.tsx:1-159`

**Step 1: Add the org switcher dropdown**

Edit `frontend/components/Sidebar.tsx`. Add imports:

```tsx
import { useOrganization } from "@/lib/organization"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
```

Inside the `Sidebar` component, add:

```tsx
const { organizations, currentOrganization, switchOrganization } = useOrganization()
const [showCreateOrg, setShowCreateOrg] = useState(false)
```

Replace the Logo area section (lines 72-84) with the org switcher:

```tsx
{/* Organization switcher */}
<div className="px-3 py-4">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--sidebar-accent)]/50 transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] shrink-0">
          <span className="text-[var(--sidebar-primary-foreground)] text-sm font-bold font-[family-name:var(--font-body)]">
            {currentOrganization?.name?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <span className="flex-1 truncate text-sm font-medium text-[var(--sidebar-foreground)] font-[family-name:var(--font-body)]">
          {currentOrganization?.name ?? "Organisation"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--sidebar-foreground)]/40" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-[232px]">
      {organizations.map((org) => (
        <DropdownMenuItem
          key={org.id}
          onClick={() => switchOrganization(org.id)}
          className="flex items-center gap-2"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary shrink-0">
            {org.name[0]?.toUpperCase()}
          </div>
          <span className="flex-1 truncate">{org.name}</span>
          {org.id === currentOrganization?.id && (
            <Check className="h-4 w-4 shrink-0 text-primary" />
          )}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setShowCreateOrg(true)} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Créer une organisation
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

At the end of the component (before the closing `</>`) add the CreateOrgDialog render:

```tsx
<CreateOrgDialog open={showCreateOrg} onOpenChange={setShowCreateOrg} />
```

**Step 2: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(org): add organization switcher dropdown to sidebar"
```

---

### Task 5: Frontend — Create CreateOrgDialog component

**Files:**
- Create: `frontend/components/organizations/CreateOrgDialog.tsx`

**Step 1: Create the dialog component**

Create `frontend/components/organizations/CreateOrgDialog.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useOrganization } from "@/lib/organization"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { createOrganization } = useOrganization()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await createOrganization(name.trim())
      setName("")
      onOpenChange(false)
    } catch {
      setError("Erreur lors de la création de l'organisation.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une organisation</DialogTitle>
          <DialogDescription>
            Donnez un nom à votre nouvelle organisation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="orgName">Nom de l'organisation</Label>
            <Input
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon entreprise"
              required
              disabled={isLoading}
              className="h-11"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add import in Sidebar**

Add to the imports in `frontend/components/Sidebar.tsx`:

```tsx
import { CreateOrgDialog } from "@/components/organizations/CreateOrgDialog"
```

**Step 3: Commit**

```bash
git add frontend/components/organizations/CreateOrgDialog.tsx frontend/components/Sidebar.tsx
git commit -m "feat(org): add CreateOrgDialog component"
```

---

### Task 6: Frontend — Add `organization_name` to registration form

**Files:**
- Modify: `frontend/app/(auth)/register/page.tsx`
- Modify: `frontend/lib/auth.tsx:37-53`
- Modify: `frontend/types/auth.ts:13-18`

**Step 1: Update AuthContextType to include `organization_name`**

Edit `frontend/types/auth.ts` — update the `register` signature (line 13-18):

```typescript
register: (data: {
  email: string
  password: string
  first_name: string
  last_name: string
  organization_name: string
}) => Promise<void>
```

**Step 2: Update auth.tsx register function**

Edit `frontend/lib/auth.tsx` — update the register callback parameter type (line 38-43):

```typescript
const register = useCallback(
  async (formData: {
    email: string
    password: string
    first_name: string
    last_name: string
    organization_name: string
  }) => {
```

No other changes needed — `formData` is already passed directly as JSON to the API.

**Step 3: Add organization_name field to register page**

Edit `frontend/app/(auth)/register/page.tsx`:

Add state (after line 16):
```typescript
const [organizationName, setOrganizationName] = useState("")
```

Update the register call (lines 28-33) to include `organization_name`:
```typescript
await register({
  email,
  password,
  first_name: firstName,
  last_name: lastName,
  organization_name: organizationName,
})
```

Add error parsing for `organization_name` (after line 42):
```typescript
if (parsed.organization_name)
  messages.push(`Organisation: ${parsed.organization_name.join(", ")}`)
```

Add the organization name field in the form, between the name grid (line 114) and the email field (line 116). Insert:

```tsx
<div className="space-y-2">
  <Label htmlFor="organizationName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
    Nom de votre organisation
  </Label>
  <Input
    id="organizationName"
    type="text"
    placeholder="Mon entreprise"
    value={organizationName}
    onChange={(e) => setOrganizationName(e.target.value)}
    required
    disabled={isLoading}
    className="h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors"
  />
</div>
```

**Step 4: Commit**

```bash
git add frontend/app/(auth)/register/page.tsx frontend/lib/auth.tsx frontend/types/auth.ts
git commit -m "feat(auth): add organization_name field to registration form"
```

---

### Task 7: Frontend — Wire hooks to refetch on org switch

**Files:**
- Modify: `frontend/hooks/useContacts.ts`
- Modify: `frontend/hooks/useDeals.ts`
- Modify: `frontend/hooks/useTasks.ts`
- Modify: `frontend/hooks/useNotifications.ts`

**Step 1: Update each hook to depend on orgVersion**

The pattern is the same for every hook. Import `useOrganization` and add `orgVersion` to the `useCallback` dependency array.

For `frontend/hooks/useContacts.ts`:

Add import:
```typescript
import { useOrganization } from "@/lib/organization"
```

In `useContactCategories()`, add at the top of the function:
```typescript
const { orgVersion } = useOrganization()
```

Change the `useCallback` dependency from `[]` to `[orgVersion]`:
```typescript
const refresh = useCallback(async () => {
  // ... same body
}, [orgVersion])
```

Apply the same pattern to `useCustomFieldDefinitions()`.

Note: `useContact(id)` fetches a single contact by ID — it doesn't need `orgVersion` since it depends on a specific contact.

For `frontend/hooks/useDeals.ts`:

Same pattern for both `usePipeline()` and `usePipelineStages()` — add `orgVersion` dependency.

For `frontend/hooks/useTasks.ts`:

Add `orgVersion` to the `useCallback` dependency (alongside the existing `JSON.stringify(filters)`):
```typescript
}, [JSON.stringify(filters), orgVersion])
```

For `frontend/hooks/useNotifications.ts`:

Add `orgVersion` to the `refreshUnreadCount` dependency and include it in the `useEffect` deps array:
```typescript
const refreshUnreadCount = useCallback(async () => {
  // ... same body
}, [orgVersion])
```

**Step 2: Commit**

```bash
git add frontend/hooks/useContacts.ts frontend/hooks/useDeals.ts frontend/hooks/useTasks.ts frontend/hooks/useNotifications.ts
git commit -m "feat(org): refetch hook data on organization switch"
```

---

### Task 8: Verification — Run full test suite and manual check

**Step 1: Run backend tests**

Run: `cd backend && python manage.py test -v2`
Expected: ALL PASS

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 3: Verify manually (if dev server available)**

1. Register a new user — verify `organization_name` field is required and org is created with that name
2. Login — verify org switcher appears in sidebar with the correct org
3. Create a second org via the "+" button — verify switch happens and data refreshes
4. Switch back to first org — verify data refreshes correctly

**Step 4: Final commit if any fixes needed**
