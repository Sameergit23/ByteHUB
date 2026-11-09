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

## 3. Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o| StudentProfile : "has profile"
    User ||--o| CompanyProfile : "has profile"
    User ||--o{ RefreshToken : "owns"
    User ||--o{ EmailVerificationToken : "owns"
    User ||--o{ PasswordResetToken : "owns"
    User ||--o{ Internship : "posts (as company)"
    User ||--o{ Application : "submits (as student)"
    User ||--o{ Enrollment : "enrolled in"
    User ||--o{ Payment : "originates"
    User ||--o{ Certificate : "awarded"
    User ||--o{ AuditLog : "initiates"

    Track ||--o{ Programme : "categorizes"
    Track ||--o{ Internship : "classifies"

    Programme ||--o{ Cohort : "schedules"

    Cohort ||--o{ Enrollment : "admits"
    Cohort ||--o{ Payment : "billed for"

    Internship ||--o{ Application : "receives"

    Enrollment ||--o| Certificate : "issues"
    Enrollment }o--o| Payment : "settled by"

    Payment ||--o{ Refund : "originates"
    Payment ||--o{ PaymentEvent : "logs webhook"

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role
        boolean isEmailVerified
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    StudentProfile {
        string id PK
        string userId FK,UK
        string college
        int graduationYear
        string degree
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    CompanyProfile {
        string id PK
        string userId FK,UK
        string companyName
        boolean verified
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    Track {
        string id PK
        string slug UK
        string name
        int displayOrder
        datetime createdAt
        datetime updatedAt
    }

    Programme {
        string id PK
        string trackId FK
        string slug UK
        string title
        boolean published
        datetime createdAt
        datetime updatedAt
    }

    Cohort {
        string id PK
        string programmeId FK
        string cohortCode UK
        int priceAmount
        string currency
        int seatsTotal
        int seatsLeft
        datetime startDate
        datetime createdAt
        datetime updatedAt
    }

    Internship {
        string id PK
        string companyId FK
        string trackId FK
        string slug UK
        string title
        enum type
        int stipendAmount
        string currency
        enum status
        datetime deadline
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    Application {
        string id PK
        string internshipId FK
        string studentId FK
        enum status
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    Enrollment {
        string id PK
        string userId FK
        string cohortId FK
        string paymentId FK
        enum status
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    Payment {
        string id PK
        string orderId UK
        string userId FK
        string cohortId FK
        enum provider
        int amount
        string currency
        enum status
        string idempotencyKey UK
        datetime createdAt
        datetime updatedAt
    }

    PaymentEvent {
        string id PK
        string paymentId FK
        enum provider
        string eventType
        string eventId UK
        boolean processed
        datetime createdAt
        datetime updatedAt
    }

    Refund {
        string id PK
        string paymentId FK
        int amount
        string currency
        string gatewayRefundId UK
        string status
        datetime createdAt
        datetime updatedAt
    }

    Certificate {
        string id PK
        string enrollmentId FK,UK
        string userId FK
        string certificateCode UK
        string verificationUrl
        datetime createdAt
        datetime updatedAt
    }

    ContactMessage {
        string id PK
        string email
        string topic
        boolean isRead
        datetime createdAt
        datetime updatedAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string entityType
        string entityId
        datetime createdAt
        datetime updatedAt
    }
```

---

## 4. The 13 Required Routes

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


---

## 6. Email Deliverability & Domain Authentication (SPF, DKIM, DMARC)

To guarantee that transactional emails (tax receipts, password resets, enrolment confirmations, and application updates) land in student inboxes and never in spam folders, the sending domain must be configured with SPF, DKIM, and DMARC DNS records.

### 1. Sender Policy Framework (SPF)
Add a `TXT` record on your apex domain (`bytehub.dev`):
```dns
Type:  TXT
Host:  @
Value: v=spf1 include:resend.com ~all
```
*(If using Amazon SES, substitute `include:amazonses.com ~all`; if SendGrid, `include:sendgrid.net ~all`)*

### 2. DomainKeys Identified Mail (DKIM)
DKIM signs outgoing emails with a 2048-bit cryptographic key, proving they were not altered in transit.
Add the `CNAME` records provided by your email provider:
```dns
Type:  CNAME
Host:  resend._domainkey.bytehub.dev
Value: dkim.resend.com

Type:  CNAME
Host:  resend2._domainkey.bytehub.dev
Value: dkim2.resend.com
```

### 3. Domain-based Message Authentication, Reporting & Conformance (DMARC)
DMARC instructs receiving mail servers (Google Workspace, Outlook 365, Apple Mail) how to handle messages that fail SPF or DKIM alignment, and reports spoofing attempts back to ByteHUB.
Add a `TXT` record under the `_dmarc` subdomain:
```dns
Type:  TXT
Host:  _dmarc.bytehub.dev
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@bytehub.dev; ruf=mailto:dmarc-forensics@bytehub.dev; pct=100; sp=reject; aspf=r; adkim=r
```
- `p=quarantine`: Delivers failing emails to spam while warming up domain reputation; transition to `p=reject` after 30 days of clean alignment.
- `aspf=r` & `adkim=r`: Relaxed alignment allowing subdomains (e.g., `mail.bytehub.dev` or `admissions@bytehub.dev`).
- `rua`: Aggregate XML reporting URI for deliverability monitoring.

### 4. Unsubscribe Handling (RFC 8058 & CAN-SPAM / GDPR Compliance)
- **Essential Transactional Emails** (Password resets, payment receipts, cohort confirmations, verification links) are non-promotional and exempt from mandatory unsubscribe links under CAN-SPAM and GDPR. They strictly omit unsubscribe links to guarantee critical delivery.
- **Non-Essential Digests** (Weekly role alerts, tech digests) include both visible footer unsubscribe links and RFC 8058 compliant `List-Unsubscribe: <https://bytehub.dev/api/auth/unsubscribe?token=...>` headers enabling one-click unsubscribe in mail clients.
