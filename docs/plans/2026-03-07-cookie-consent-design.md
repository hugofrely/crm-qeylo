# Cookie Consent for PostHog

## Context

The CRM uses PostHog for analytics, initialized in `frontend/instrumentation-client.ts`. PostHog is called directly via `posthog.capture()` in ~12 files. There is currently no consent mechanism. The app serves international users including the EU (RGPD compliance required).

## Decision

Use PostHog's native opt-in/opt-out mechanism. No new dependencies.

## Design

### Changes

1. **`frontend/instrumentation-client.ts`** — Add `opt_out_capturing_by_default: true` to `posthog.init()`. PostHog will not track anything until the user opts in. All existing `posthog.capture()` calls are silently ignored when opted out.

2. **`frontend/components/CookieConsentBanner.tsx`** (new) — Client component. Checks `posthog.has_opted_in_capturing()` / `posthog.has_opted_out_capturing()`. If no choice has been made, displays a bottom banner. Two buttons: Accept (`posthog.opt_in_capturing()`) and Refuse (`posthog.opt_out_capturing()`). Banner disappears after choice. Uses `motion` for enter/exit animation.

3. **`frontend/app/layout.tsx`** — Add `CookieConsentBanner` outside `AuthProvider` so it appears on all pages including auth.

### UI

- Fixed bottom bar, glass style (semi-transparent + backdrop-blur), consistent with existing app design
- French text: "Ce site utilise des cookies analytiques pour ameliorer votre experience."
- Two buttons: "Accepter" (primary), "Refuser" (ghost/secondary)
- Enter/exit animation via `motion`

### Flow

```
Page load -> PostHog init (opt-out by default, tracks nothing)
          -> CookieConsentBanner checks status
          -> No choice yet? -> Show banner
          -> Accept -> posthog.opt_in_capturing() -> hide banner -> tracking active
          -> Refuse -> posthog.opt_out_capturing() -> hide banner -> no tracking
          -> Next visit -> PostHog remembers choice -> banner hidden
```

### What does NOT change

- No modification to the ~12 files using `posthog.capture()`
- No new dependencies
- `posthog.identify()` in auth.tsx works normally (ignored if opted out)
- No mechanism to change choice after the fact (user can clear cookies)
