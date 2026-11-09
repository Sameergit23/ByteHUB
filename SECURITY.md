# ByteHUB Security Policy & Threat Model

ByteHUB takes security, data privacy, and financial transaction integrity seriously. This document describes our vulnerability disclosure process, threat model, and defense-in-depth architectural controls.

---

## 1. Reporting a Vulnerability

If you discover a security vulnerability in ByteHUB, please report it privately:

- **Security Team Email**: `security@bytehub.dev`
- **PGP Fingerprint**: `4A8F B291 C023 99A1 8E12 56B7 33D0 19F2 E8A1 72C4`
- **Response SLA**: Initial triage within 24 hours; patch timeline provided within 72 hours.
- **Responsible Disclosure**: Please do not disclose vulnerabilities publicly or compromise user data until a remediation has been deployed.

---

## 2. Threat Model & Asset Classification

### Critical Assets (Tier 1)
1. **Financial Ledger & ACID Transactions**: Preventing seat overbooking, double-charging, webhook replay attacks, or price tampering.
2. **Student Authentication & PII**: Protecting resumes, college credentials, password hashes (Argon2id), and tokens against unauthorized access or IDOR.
3. **Company Data**: Isolating multi-tenant applicant pipelines so Company A cannot view or alter candidates for Company B.

---

## 3. Defense-in-Depth Architectural Controls (OWASP Top 10)

| OWASP Top 10 Category | ByteHUB Architectural Mitigation |
| :--- | :--- |
| **A01: Broken Access Control** | Next.js Edge Middleware route guards combined with server-side RBAC and strict IDOR resource ownership verification. Students cannot call employer/admin endpoints; companies cannot inspect unassociated applicant pools. |
| **A02: Cryptographic Failures** | Card data never touches ByteHUB servers. Webhooks verified with constant-time HMAC-SHA256 (`crypto.timingSafeEqual`). Passwords hashed with Argon2id. Sensitive data encrypted at rest with AES-256-GCM. |
| **A03: Injection** | Parameterized Prisma queries ban raw SQL concatenation. Magic bytes verification prevents file-spoofing attacks (`%PDF-`, `PK\x03\x04`). All inputs parsed and sanitized with strict Zod schemas. |
| **A04: Insecure Design** | ACID row-locking transactions for cohort seat decrement. Strict payment state machine (`CREATED` → `PENDING` → `PAID` → `REFUNDED`) rejecting illegal out-of-order transitions. |
| **A05: Security Misconfiguration** | Strict Content Security Policy (CSP), HSTS (2 years with preload), `X-Content-Type-Options: nosniff`, `Permissions-Policy`, explicit CORS allow-list (no wildcard with credentials). |
| **A06: Vulnerable & Outdated Components** | Automated Dependabot and lockfile verification. Regular `pnpm audit` in CI. |
| **A07: Identification & Auth Failures** | Token rotation with reuse detection (family invalidation). Brute-force lockout (5 attempts / 15 mins). RFC 6238 TOTP 2FA for administrative mutations. |
| **A08: Software & Data Integrity Failures** | Webhook deduplication via `PaymentEvent` table preventing replay attacks. Server decides all pricing from PostgreSQL (never accepts client-provided prices). |
| **A09: Security Logging & Monitoring** | Every administrative data export, refund, and payment status change is recorded in `AuditLog`. Error handlers mask internal database errors and stack traces. |
| **A10: Server-Side Request Forgery (SSRF)** | Restrictive outbound HTTP calls with strict host/protocol allow-lists. No user-supplied URLs fetched on backend. |

---

## 4. Privacy & Compliance

- **Right to Data Portability**: `GET /api/auth/me/export` delivers machine-readable JSON exports.
- **Right to Erasure**: `DELETE /api/auth/me` anonymizes PII and purges tokens.
- **Cookie Consent**: Explicit banner for essential and optional analytics cookies.
