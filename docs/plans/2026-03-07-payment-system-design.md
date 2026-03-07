# Payment System & Quotas Design

## Context

Qeylo CRM has 3 pricing tiers defined on the landing page but no payment infrastructure. This design covers Stripe integration, subscription management, quota enforcement, and billing UI.

## Decisions

- **Payment provider**: Stripe (Checkout + webhooks, Stripe-centric approach)
- **Billing entity**: Organization (not user)
- **No free trial**: Solo plan serves as the free tier
- **Billing cycle**: Monthly only (annual later)
- **Upgrade**: Immediate with prorata
- **Downgrade**: Effective at end of billing cycle
- **Over-limit after downgrade**: Read-only mode (no data deletion)
- **Quota enforcement**: Hard block with upgrade prompt

## Plans

| | Solo (0 EUR) | Pro (19 EUR/mois) | Equipe (49 EUR/mois) |
|---|---|---|---|
| Utilisateurs | 1 | 1 | Illimite |
| Contacts | 100 | Illimite | Illimite |
| Pipelines | 1 | Illimite | Illimite |
| Etapes personnalisables | Non | Oui | Oui |
| Messages IA/mois | 50 | Illimite | Illimite |
| Segments dynamiques | Non | Oui | Oui |
| Produits & catalogue | Non | Oui | Oui |
| Detection doublons | Non | Oui | Oui |
| Workflows | Non | Oui | Oui |
| Email templates | Non | Oui | Oui |
| Email integration | Non | Oui | Oui |
| CSV Import/Export | Non | Oui | Oui |
| Dashboard avance | Non | Oui | Oui |
| Rapports personnalises | Non | Oui | Oui |
| Entonnoir conversion | Non | Oui | Oui |
| Assignation equipe | Non | Non | Oui |
| API access | Non | Non | Oui |
| Support prioritaire | Non | Oui | Oui |
| Onboarding dedie | Non | Non | Oui |

## Data Model

### New Django app: `subscriptions`

**`Subscription`** (OneToOne with Organization):
- `organization` - FK to Organization
- `stripe_customer_id` - Stripe Customer ID
- `stripe_subscription_id` - Stripe Subscription ID (nullable for Solo)
- `plan` - CharField choices: `solo`, `pro`, `team`
- `status` - CharField: `active`, `past_due`, `canceled`, `unpaid`
- `current_period_end` - DateTimeField
- `cancel_at_period_end` - BooleanField
- `created_at`, `updated_at`

**Plan quotas**: Defined as Python constants (not in DB). See `PLAN_QUOTAS` dict with `max_contacts`, `max_pipelines`, `max_pipeline_stages`, `max_users`, `max_ai_messages_per_month`, and a `features` dict of booleans.

No Invoice model — invoices fetched directly from Stripe API.

## Stripe Architecture

### Configuration

Products and Prices created in Stripe Dashboard. Price IDs stored in env vars:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_TEAM_PRICE_ID`

### Upgrade Flow

1. Owner/admin clicks "Upgrade" in `/settings/organization`
2. Backend creates Stripe Customer (if needed) + Checkout Session
3. Frontend redirects to Stripe Checkout
4. Stripe sends `checkout.session.completed` webhook
5. Backend creates/updates Subscription

### Downgrade Flow

1. Owner/admin clicks "Downgrade"
2. Backend calls Stripe to modify subscription:
   - To Solo: `cancel_at_period_end=True`
   - Pro to Team or vice versa: schedule price change at period end
3. Subscription updated with scheduled change

### Webhooks

Endpoint: `POST /api/webhooks/stripe/` (no JWT auth, verified by Stripe signature, exempt from Organization middleware)

| Webhook | Action |
|---------|--------|
| `checkout.session.completed` | Create/activate Subscription |
| `invoice.paid` | Confirm payment, update `current_period_end` |
| `invoice.payment_failed` | Set status to `past_due` |
| `customer.subscription.updated` | Sync plan, status, period |
| `customer.subscription.deleted` | Revert org to Solo plan |

## Quota Enforcement

### QuotaService

Centralized service with static methods:
- `check_can_create_contact(organization) -> bool`
- `check_can_create_pipeline(organization) -> bool`
- `check_can_send_ai_message(organization) -> bool`
- `check_can_add_member(organization) -> bool`
- `check_feature_enabled(organization, feature: str) -> bool`
- `get_usage_summary(organization) -> dict`

### Enforcement Points

Each relevant ViewSet calls QuotaService before create actions:
- `ContactViewSet.create` -> `check_can_create_contact`
- `PipelineViewSet.create` -> `check_can_create_pipeline`
- `ChatViewSet` (send message) -> `check_can_send_ai_message`
- `Membership/Invitation` -> `check_can_add_member`
- Feature-gated views (segments, workflows, products, etc.) -> `check_feature_enabled`

### Blocked Response

HTTP 403:
```json
{
    "error": "quota_exceeded",
    "detail": "Vous avez atteint la limite de 100 contacts pour le plan Solo.",
    "limit": 100,
    "current": 100,
    "upgrade_required": "pro"
}
```

### AI Message Counter

Uses existing `AIUsageLog` model. Count filtered by organization + current month + `call_type=chat`.

### Read-Only Mode After Downgrade

When org exceeds limits (e.g., 500 contacts on Solo): `create` actions blocked, `list`/`retrieve`/`update` remain accessible. No data deletion.

## API Endpoints

### Subscriptions App

| Method | Endpoint | Role | Access |
|--------|----------|------|--------|
| GET | `/api/subscriptions/` | Current plan, status, period | Owner/Admin |
| GET | `/api/subscriptions/usage/` | Quota counters vs limits | All members |
| POST | `/api/subscriptions/checkout/` | Create Stripe Checkout Session | Owner/Admin |
| POST | `/api/subscriptions/downgrade/` | Schedule downgrade | Owner/Admin |
| POST | `/api/subscriptions/cancel/` | Cancel subscription (-> Solo at period end) | Owner/Admin |
| POST | `/api/subscriptions/reactivate/` | Cancel a scheduled downgrade/cancel | Owner/Admin |
| GET | `/api/subscriptions/invoices/` | Invoice list (via Stripe API) | Owner/Admin |
| GET | `/api/subscriptions/payment-method/` | Current card (via Stripe API) | Owner/Admin |
| POST | `/api/subscriptions/update-payment-method/` | Create SetupIntent to change card | Owner/Admin |
| POST | `/api/webhooks/stripe/` | Stripe webhook | Public (signature) |

### Permission

`IsOrganizationOwnerOrAdmin` — checks user role in org membership.

## Frontend

### Billing Section in `/settings/organization`

Visible only to owner/admin. Components:
- **PlanCard** — Current plan badge, renewal date, upgrade/downgrade button
- **UsageBar** — Progress bars for contacts, pipelines, AI messages (visible to all members)
- **PaymentMethod** — Current card with edit button (Stripe Elements)
- **InvoiceList** — Recent invoices table with PDF download links (from Stripe)
- **UpgradeModal** — Plan selection modal before redirect to Stripe Checkout

### Upgrade Wall

When an action returns 403 `quota_exceeded`, frontend shows an upgrade toast/modal with error message and button to billing page.
