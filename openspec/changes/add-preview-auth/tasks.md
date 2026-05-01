## 1. Render and Sanity preview environments

- [ ] 1.1 Create a Render Web Service connected to the `main` branch of
      `hmcts/dts-crime-portfolio` with auto-deploy
- [ ] 1.2 Create a separate Sanity dataset (e.g. `preview`) with seeded
      test-only data; configure Render env to point at it
- [ ] 1.3 Generate `PREVIEW_AUTH_COOKIE_SECRET` (32+ random bytes) and add
      it as a Render env var
- [ ] 1.4 Set `APP_ENVIRONMENT=preview` on the Render service

## 2. Middleware and routes

- [ ] 2.1 Implement Next.js middleware that runs on every request, checks
      the `previewAuth` cookie, verifies HMAC, rewrites `x-user-email`,
      and redirects to `/preview-auth` when missing or invalid
- [ ] 2.2 Build the email-entry page at `/preview-auth` with RFC-5322
      validation, the "Continue" button, and the non-production banner
- [ ] 2.3 Build `POST /preview-auth/sign-out` that clears the cookie
- [ ] 2.4 Strip any inbound `x-user-email` header on every request before
      applying the cookie-derived value
- [ ] 2.5 Write the `previewSession` audit document on first sign-in per
      email; update `lastSeenAt` on repeat sign-ins

## 3. Production safety

- [ ] 3.1 Gate the middleware import behind `APP_ENVIRONMENT !==
      "production"` so tree-shaking removes it from the production bundle
- [ ] 3.2 Add a CI step that runs the production build with
      `APP_ENVIRONMENT=production` and asserts the preview-auth bundle is
      absent
- [ ] 3.3 Add a CI step that fails if `PREVIEW_AUTH_COOKIE_SECRET` is set
      alongside `APP_ENVIRONMENT=production`
- [ ] 3.4 Make `/preview-auth` and `/preview-auth/sign-out` return HTTP
      404 when `APP_ENVIRONMENT=production`

## 4. Visual indicator and verification

- [ ] 4.1 Add the persistent "Preview environment — not production. Test
      data only." banner with the signed-in email and "Sign out" control
- [ ] 4.2 Add a smoke test that proves: no cookie → 302 to
      `/preview-auth`; valid cookie → header injected; tampered cookie →
      cookie cleared and 302; production env → middleware inert and
      preview routes 404
- [ ] 4.3 Validate this OpenSpec change with `openspec validate
      add-preview-auth --strict`; archive it once the preview is shipped
      and the upstream-proxy production hosting takes over
