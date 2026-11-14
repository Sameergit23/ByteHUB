# ByteHUB — Launch Tasks

Last updated: 11 November 2026. Budget for hosting right now: **₹0**.

## Done

- [x] Code connected to the API, security fixes, legal pages, CI green (GitHub Actions)
- [x] Next.js 15 / React 19 / Zod 4 / Vitest 4 upgrade (security audit: 1 moderate left)
- [x] Code on GitHub (`Sameergit23/ByteHUB`, branch `master`)
- [x] Production database: new Supabase project (Sydney), tables + programmes loaded, demo data retired
- [x] Domain `bytehubnet.com` recovered in Wix
- [x] Email sending: Resend domain verified, API key created
- [x] Email receiving: `support@bytehubnet.com` on Google Workspace
- [x] Hosting decision: **Option A** — two free Render services (chosen 10 Nov 2026)
- [x] Resumes stored in Supabase Storage (private bucket, created by the API on first start)

## Hosting decision (made: Option A)

Both options need the code change "store resumes in Supabase Storage" (below), because free
hosting has no permanent disk.

- [x] **Option A (recommended, CHOSEN): two free services.** The API and website are set up separately,
      exactly as planned, just on the free plan. It's the simplest. The only code change is moving
      resumes to Supabase Storage (about 30 minutes of work for Claude). You can upgrade the API to
      $7/month later, once payments come in, with a single click.
      Trade-off: each service sleeps after 15 minutes without visitors; the first visit after that
      takes about 30–60 seconds.
- [ ] ~~Option B: one combined free service, kept awake.~~ (not chosen) The website and API are packaged into a
      single service, with a free uptime pinger so it never sleeps. Fast, but more work. It uses
      about 730 of Render's 750 free hours a month by itself, so your other free Render services
      would have to be stopped, and running two programs in one container is more fragile.

## Pending — code (Claude)

- [x] Store uploaded resumes in Supabase Storage instead of the server's disk (needed for free hosting)
- [x] Admin panel redesigned as its own back office: sidebar, overview, approvals with review
      panel, users, cohorts (edit seats), enrolments, payments/refunds, inbox, audit log, system
      health (11 Nov 2026)
- [x] Internship offer letter: emailed when a seat is confirmed (after payment), printable page
      in the student dashboard (`/dashboard/student/offer-letter/<id>`)
- [x] Certificates: admin marks a student (or a whole cohort) completed → certificate created and
      emailed; public check page `bytehubnet.com/verify/<ID>`
- [x] Page reveal animations, loaders, clear animated messages per error type, wake-up ping and
      automatic retries while the free API wakes
- [x] Wrong domains fixed: emails linked to bytehub.dev, share links/sitemap fallback to bytehub.io
- [x] Only ByteHUB posts internships and training: no company sign-up; admin panel can post/edit
      internships, review applications and resumes, and create/edit programmes and cohorts
- [x] Internship registration fee: admin chooses Paid/Unpaid stipend and Free/Charge-a-fee when
      posting; students pay the fee online (Cashfree) when applying; the application reaches the
      admin only once paid ("Awaiting payment" filter); marking an applicant **Not selected**
      records a full refund, which admin then sends from the Cashfree dashboard
- [x] Apply form: phone country code picker; PIN code fills city and state (India Post lookup);
      area, street address; searchable college list (type your own if missing); GitHub, LinkedIn
      and the written questions are optional. Fixed: "Continue" on step 3 could skip the review step
- [x] Admin security (14 Nov 2026): two-factor sign-in (authenticator app + 10 backup codes) for
      every staff account; staff roles with permissions checked by the server (Super Admin, Admin,
      Manager, Moderator, Staff, custom roles); block/unblock, edit, delete users and send
      password resets; staff sessions end after 60 minutes idle or 12 hours; admin panel at a
      secret address (`ADMIN_PATH`), `/admin` shows "page not found"
- [ ] Admin panel, later phases: dashboard charts and reports (CSV/PDF), email announcements and
      notification history, application settings, integrations status, data backup download
- [ ] Only if you ever add a **free** cohort: a "join for free" endpoint (paid cohorts work; the
      API currently has no direct enrolment for price 0)

## Pending — setup (you)

- [ ] GitHub: make `master` the default branch (Settings → General) and delete the starter `main` branch
- [ ] Render: check **Billing** for free-hour usage; suspend services you no longer need
- [x] Render: create the API service — live at `https://bytehub-api.onrender.com` (health: UP,
      database healthy). Docker, branch `master`, region **Singapore**, plan **Free**, no disk,
      health check `/api/health`, `STORAGE_DRIVER=supabase` with the Supabase storage keys
- [x] Render: create the website service — `bytehub-web`, Dockerfile `apps/web/Dockerfile`, region
      Singapore, plan Free, `API_INTERNAL_URL=https://bytehub-api.onrender.com/api`,
      `NEXT_PUBLIC_SITE_URL=https://bytehubnet.com`
- [x] Render + Wix DNS: `bytehubnet.com` live on Render with HTTPS (Wix: domain unassigned from the
      Wix site, A `216.24.57.1`, CNAME `www` → `bytehub-web.onrender.com`)
- [ ] `www.bytehubnet.com`: certificate issued in Render, but Cloudflare still routes it to Wix
      (shows a Wix error page). If it doesn't clear on its own, ask Wix support to remove
      `www.bytehubnet.com` from Wix's hosting / Cloudflare custom hostnames
- [ ] Local: switch `apps/api/.env` to Cashfree **sandbox** keys (it still has live keys)

## Pending — testing (Phase 7, on the live site, sandbox payments)

- [x] Sign up → verification email arrives and the link verifies the account (11 Nov 2026)
- [x] Make yourself admin (Supabase SQL: `update "User" set role = 'ADMIN' where email = '...'`)
- [x] Supabase: run the database fix (migration `20261111000000_sync_enrollment_payment_status`),
      then restart the API on Render. The production database was missing enrolment columns and
      payment/enrolment status values, which broke the admin panel and would break payments
- [x] Admin panel loads with no error (after the database fix)
- [ ] **Before pushing the fee + form update:** Supabase SQL Editor: run the database update for
      migrations `20261111120000_internship_registration_fee` and
      `20261111130000_application_form_details` (Claude gives the SQL). The new code needs these
      columns, so run it first, then push
- [ ] **Before pushing the admin security update:** Supabase SQL Editor: run the update for
      migration `20261114120000_staff_roles_two_factor` (Claude gives the SQL). Then in Render →
      bytehub-web → Environment add `ADMIN_PATH` = your secret admin address (letters, digits and
      dashes, 8+ characters, e.g. `ops-9sxf0httdpvxzw`). After the deploy: sign in at
      bytehubnet.com → you're taken to the admin panel → set up the authenticator app → save the
      backup codes
- [ ] Post an internship with a ₹1 registration fee → apply → pay in the sandbox → application
      shows as New in Admin → Applications → mark Not selected → refund recorded → refund in Cashfree
- [ ] Admin posts an internship (Admin → Internships → Post internship) → student applies with resume →
      admin opens the resume and moves the stage (Admin → Applications) → student gets the email
- [ ] Admin creates a programme and a cohort (Admin → Programmes & cohorts) → it shows on /training
- [ ] Sandbox payment → seat confirmed, receipt email, appears in dashboard
- [ ] Forgot password, contact form, refund from admin panel
- [ ] After the sandbox payment: offer letter email arrives and the letter opens from the dashboard
- [ ] Admin → Enrolments → Mark completed → certificate email arrives and `/verify/<ID>` shows it
- [ ] Resume still opens after a redeploy

## Admin security: if a staff member is locked out

- Lost phone: sign in with one of the 10 backup codes, then another Super Admin resets their
  two-factor (Users → open the person → Reset two-factor) so they can set it up again.
- The only Super Admin lost both phone and backup codes: Supabase → SQL Editor, run
  `update "User" set "twoFactorSecret" = null, "twoFactorEnabledAt" = null, "twoFactorBackupCodes" = '{}' where email = 'YOUR EMAIL';`
  then sign in and set up the authenticator again.
- Changing `JWT_SECRET` on Render makes every stored authenticator key unreadable: all staff
  set up two-factor again at their next sign-in.
- Forgot the secret admin address: just sign in at bytehubnet.com; staff are sent there
  automatically. It's also in Render → bytehub-web → Environment → `ADMIN_PATH`.

## Pending — real payments (Phase 8)

- [ ] Cashfree: finish KYC / business verification and submit the live website for review
- [ ] Cashfree live dashboard: whitelist `bytehubnet.com`, add webhook
      `<API address>/api/payments/webhooks/cashfree` (API version `2023-08-01`)
- [ ] Render: switch to live Cashfree keys, `CASHFREE_ENV=PRODUCTION`
- [ ] One real ₹1 payment (temporarily set a cohort price to `100` paise), then refund it

## Pending — before / at launch

- [ ] Lawyer reviews Terms, Privacy and Refund pages → set `reviewed: true` in `apps/web/src/lib/siteConfig.ts`
- [ ] Review the offer letter wording and who signs letters/certificates (`documents` in
      `apps/web/src/lib/siteConfig.ts`, now "Team ByteHUB, Programme Office"), ideally with the lawyer
- [ ] Add real internships (companies sign up and post; approve in `/admin`)
- [ ] Check every cohort's price, dates and seats in Supabase (Cohort table; prices in paise)

## Later (after launch, when budget allows)

- [ ] Upgrade the API to Render's $7/month plan (no sleeping, always-on background jobs)
- [ ] Supabase Pro plan for daily backups (the free plan has none)
- [ ] Sentry error reporting (free tier): set `SENTRY_DSN` on the API
- [ ] Admin two-factor login
- [ ] Refunds through Cashfree's API (refunds are recorded in the admin panel but sent manually from the Cashfree dashboard for now)
- [ ] Rewrite the Playwright browser tests for the live data
- [ ] Optional: Google Workspace DKIM record (better delivery for emails sent from Workspace)
- [x] Remove the two deprecated lines at the top of `.husky/pre-commit` (they break in Husky v10)
