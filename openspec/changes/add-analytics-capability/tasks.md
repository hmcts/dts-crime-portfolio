## 1. Decisions

- [ ] 1.1 Decide PostHog hosting target (SaaS EU vs self-hosted) with
      HMCTS information governance, and provision the project
- [ ] 1.2 Draft privacy notice copy and consent-banner wording with HMCTS
      information governance; load it into Sanity
- [ ] 1.3 Decide whether `ANALYTICS_INGEST_MODE` defaults to `direct` or
      `proxy` for production, and whether to enable `ANALYTICS_DROP_IP`

## 2. Foundations

- [ ] 2.1 Add the closed event-catalogue type (`AnalyticsEvent` union
      with property maps per event) and a strongly typed `track()` wrapper
- [ ] 2.2 Implement the consent store (localStorage with 12-month expiry)
      and a React provider that gates SDK loading on consent
- [ ] 2.3 Implement `userId = sha256(email + serverPepper)` identification
      and call `identify` once per session after consent
- [ ] 2.4 Build the consent banner component reading copy from Sanity

## 3. Same-origin ingest proxy

- [ ] 3.1 Implement `POST /api/analytics/ingest` that forwards to PostHog
      with the project key attached server-side
- [ ] 3.2 Drop the `x-user-email` header in the proxy and respect
      `ANALYTICS_DROP_IP`
- [ ] 3.3 Reject proxy requests lacking the `analyticsConsent=granted`
      cookie with HTTP 204 and `Cache-Control: no-store`

## 4. Event call sites

- [ ] 4.1 Wire `page_view` in the App Router root layout, passing route
      template (not the realised path) and section
- [ ] 4.2 Wire `filter_applied` on portfolio, action plan, prompts,
      learning, events, help — passing `valueCount` only, never the raw
      query
- [ ] 4.3 Wire `dossier_opened` with `source` resolved from the entry
      route
- [ ] 4.4 Wire `export_generated` for every export call site (Excel
      portfolio, single-project Excel, ownership Word, PowerPoint summary,
      compliance briefing, compare Word)
- [ ] 4.5 Wire `prompt_upvoted` and `prompt_commented` after the API call
      succeeds
- [ ] 4.6 Wire `submission_started` (with `entry`) and
      `submission_completed` (with `projectId` and `calculatedTier`)
- [ ] 4.7 Wire `galaxy_lens_changed` and `galaxy_overlay_toggled`

## 5. Self-service control and verification

- [ ] 5.1 Add the analytics on/off toggle to `/profile` with the in-page
      confirmation copy
- [ ] 5.2 Add a smoke test that asserts the SDK does not load and no
      network call to PostHog or `/api/analytics/ingest` fires before
      consent
- [ ] 5.3 Add a smoke test that asserts no event payload contains an
      email, project name, prompt body, or raw search query
- [ ] 5.4 Validate this OpenSpec change with `openspec validate
      add-analytics-capability --strict` and archive once shipped
