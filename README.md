# ByteHUB Platform

Production-grade talent infrastructure connecting engineering students with vetted internships and rigorous paid training programs. Built with strict types, ACID transactional payments, and Swiss Modernist editorial design tokens.

---

## 1. Architectural Stack

- **Frontend:** Next.js 14 App Router, TypeScript (Strict), Tailwind CSS, WCAG 2.2 AA compliant.
- **Backend API:** Node.js, Express.js (Layered MVC: routes, controllers, services, repositories).
- **Validation:** Zod schemas across shared contracts, client forms, and Express request middlewares.
- **Database & Transactions:** PostgreSQL via Prisma ORM with serializable/isolated ACID transactions.
- **Payments:**
  - **Razorpay (India):** UPI, RuPay, Netbanking, Cards with HMAC-SHA256 signature verification.
  - **Stripe (Global):** 3D Secure 2, credit/debit card PaymentIntents, webhook signature validation.
  - **Idempotency:** Unique idempotency keys prevent duplicate billing or double enrollments.
- **Design Tokens:**
  - Background: Warm off-white (`#F5F2EA`)
  - Ink: Near-black (`#16150F`)
  - Accent: Editorial Vermillion (`#B8341A`)
  - Muted: Warm Charcoal (`#5A574D`)
  - Borders: Thin 1px (`#D8D3C4`)
  - Typography: Space Grotesk (headings), Inter (body), Space Mono (metadata)
  - Layout: Square corners (`rounded-none`), 8px spacing scale, high-contrast grid lines.

---

## 2. Directory Structure

```text
├── apps/
│   ├── web/                     # Next.js 14 App Router Web Application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                    # Route: / (Home)
│   │   │   │   ├── about/page.tsx              # Route: /about (About & Manifesto)
│   │   │   │   ├── internships/page.tsx        # Route: /internships (Directory)
│   │   │   │   ├── internships/[id]/page.tsx   # Route: /internships/:id (Detail)
│   │   │   │   ├── training/page.tsx           # Route: /training (Curriculum list)
│   │   │   │   ├── training/[id]/page.tsx      # Route: /training/:id (Detail & Checkout)
│   │   │   │   ├── for-companies/page.tsx      # Route: /for-companies (Employer portal)
│   │   │   │   ├── contact/page.tsx            # Route: /contact (Direct inquiry desk)
│   │   │   │   ├── auth/page.tsx               # Route: /auth (Login & Register)
│   │   │   │   ├── login/page.tsx              # Route: /login (Redirect to auth)
│   │   │   │   ├── signup/page.tsx             # Route: /signup (Redirect to auth)
│   │   │   │   ├── apply/[id]/page.tsx         # Route: /apply/:id (4-Step application)
│   │   │   │   ├── dashboard/student/page.tsx  # Route: /dashboard/student
│   │   │   │   ├── dashboard/company/page.tsx  # Route: /dashboard/company
│   │   │   │   └── admin/page.tsx              # Route: /admin (Supervision & Ledger)
│   │   │   ├── components/                     # Navbar, Footer, UI elements
│   │   │   └── lib/                            # api client, mockData
│   │   └── tailwind.config.ts
│   │
│   └── api/                     # Node.js + Express API
│       ├── prisma/schema.prisma # PostgreSQL Prisma schema
│       ├── src/
│       │   ├── config/          # Zod-validated environment config
│       │   ├── lib/             # Prisma client singleton
│       │   ├── middleware/      # JWT auth, RBAC, Zod validation, error handler
│       │   ├── routes/          # auth, internships, training, applications, payments, admin
│       │   ├── services/        # ACID payment fulfillment & verification
│       │   ├── app.ts           # Express application factory
│       │   └── server.ts        # Production listener
│       └── tests/               # Vitest & Supertest suite
│
├── packages/
│   └── shared/                  # Shared Zod schemas & TypeScript types
│       ├── src/
│       │   ├── schemas/         # auth, internship, training, application, payment
│       │   └── index.ts
│       └── tests/               # Schema unit tests
│
├── tsconfig.base.json           # Strict TypeScript configuration
└── package.json                 # Monorepo workspace configuration
```

---

## 3. The 13 Required Routes

1. **Home (`/`)**: High-contrast headline, real metrics, featured roles, training tracks, comparison standard.
2. **About (`/about`)**: Editorial manifesto, engineering principles, stack architecture specification.
3. **Internships List (`/internships`)**: Search by skill/role, work arrangement filter, min stipend selector.
4. **Internship Detail (`/internships/[id]`)**: Full scope, technical requirements, stipend and perks, direct apply button.
5. **Training List (`/training`)**: Paid systems engineering cohorts, outcomes, seat countdowns, INR/USD prices.
6. **Training Detail (`/training/[id]`)**: Week-by-week syllabus deliverables, interactive Razorpay/Stripe checkout.
7. **For Companies (`/for-companies`)**: Employer value proposition, verified hiring protocol, job publishing form.
8. **Contact (`/contact`)**: Communications dispatch desk, office headquarters, PGP key.
9. **Log in / Sign up (`/auth`, `/login`, `/signup`)**: Student & company credentials onboarding with secure JWT.
10. **Application Form (`/apply/[id]`)**: 4 distinct steps:
    - *Step 1:* Personal & Academic Credentials
    - *Step 2:* GitHub, LinkedIn, Portfolio & Resume Links
    - *Step 3:* Technical Screening & Complex Project Breakdown
    - *Step 4:* Final Candidate Review & Affidavit
11. **Student Dashboard (`/dashboard/student`)**: Applications pipeline, enrolled lab progress, payment ledger.
12. **Company Dashboard (`/dashboard/company`)**: Internship listings, candidate pipeline, code dossier review.
13. **Admin Panel (`/admin`)**: Metric analytics, internship moderation, ACID transaction audit ledger, user directory.

---

## 4. Run & Test Commands

### Install dependencies
```bash
npm install
```

### Run Tests
```bash
# Run shared schemas tests & Express API tests
npm test
```

### Start Development
```bash
# Terminal 1: Backend Express API (port 5000)
npm run dev:api

# Terminal 2: Next.js Frontend (port 3000)
npm run dev:web
```

### Typecheck & Build
```bash
npm run typecheck
npm run build
```

---

## 5. Security & Accessibility Invariants

- **WCAG 2.2 AA Contrast:** All text passes 4.5:1 ratio against `#F5F2EA`.
- **Keyboard Navigation:** Explicit `:focus-visible` ring on interactive elements.
- **Server Validation:** Every mutation route validates against Zod schemas; client is never trusted.
- **ACID Transactions:** Payments, seat decrements, and student enrollments commit atomically in `prisma.$transaction`.
- **Zero Secrets in Code:** Environment secrets strictly parsed via `env.ts`.

