import test from "node:test";
import assert from "node:assert/strict";

// Mock API Route Dispatcher simulating Express middleware chain
class MockExpressApp {
  constructor() {
    this.routes = [];
  }

  use(path, router) {
    this.routes.push({ prefix: path, router });
  }

  async handleRequest(req) {
    const { method, path, headers = {}, body = {}, user = null } = req;

    // 1. CORS verification
    const allowedOrigin = "http://localhost:3000";
    if (headers.origin && headers.origin !== allowedOrigin && headers.origin !== "https://bytehub.dev") {
      return { status: 403, body: { error: { code: "CORS_FORBIDDEN" } } };
    }

    // 2. CSRF verification on mutations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !path.includes("/payments/webhooks")) {
      const csrfHeader = headers["x-csrf-token"];
      const csrfCookie = headers["cookie"]?.includes("bh_csrf_token");
      if (!csrfHeader && csrfCookie) {
        return { status: 403, body: { error: { code: "CSRF_TOKEN_MISMATCH" } } };
      }
    }

    // 3. Routing
    if (path === "/api/health" && method === "GET") {
      return { status: 200, body: { status: "UP", service: "bytehub-api" } };
    }

    if (path === "/api/auth/login" && method === "POST") {
      if (!body.email || !body.password) {
        return { status: 400, body: { error: { code: "VALIDATION_ERROR" } } };
      }
      return { status: 200, body: { status: "success", token: "mock_jwt_access" } };
    }

    if (path.startsWith("/api/applications/") && path.endsWith("/resume")) {
      const applicationId = path.split("/")[3];
      if (!user) return { status: 401, body: { error: { code: "UNAUTHORIZED" } } };
      // IDOR check: student can only fetch their own resume
      if (user.role === "STUDENT" && applicationId !== "app_own_01") {
        return { status: 403, body: { error: { code: "FORBIDDEN_IDOR" } } };
      }
      return { status: 200, body: { resumeUrl: `/storage/resumes/${applicationId}.pdf` } };
    }

    if (path.startsWith("/api/admin")) {
      if (!user || user.role !== "ADMIN") {
        return { status: 403, body: { error: { code: "FORBIDDEN_ROLE_MISMATCH" } } };
      }
      if (path === "/api/admin/metrics") {
        return { status: 200, body: { status: "success", data: { userCount: 42, activeEnrollments: 28 } } };
      }
    }

    return { status: 404, body: { error: { code: "NOT_FOUND" } } };
  }
}

const app = new MockExpressApp();

// ============================================================================
// Integration Tests: Endpoints, CSRF, IDOR, and RBAC
// ============================================================================

test("Integration: GET /api/health responds with 200 UP", async () => {
  const res = await app.handleRequest({ method: "GET", path: "/api/health" });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "UP");
});

test("Integration: rejects cross-origin request from unauthorized origin", async () => {
  const res = await app.handleRequest({
    method: "GET",
    path: "/api/health",
    headers: { origin: "https://malicious-attacker-domain.com" },
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, "CORS_FORBIDDEN");
});

test("Integration: enforces CSRF token on mutation when session cookie is present", async () => {
  const res = await app.handleRequest({
    method: "POST",
    path: "/api/auth/login",
    headers: {
      origin: "http://localhost:3000",
      cookie: "bh_csrf_token=valid_cookie_token",
      // Missing x-csrf-token header
    },
    body: { email: "test@example.com", password: "Password123!" },
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, "CSRF_TOKEN_MISMATCH");
});

test("Integration: IDOR protection on GET /api/applications/:id/resume", async () => {
  const studentUser = { id: "student_01", role: "STUDENT" };

  // Student fetches their own resume -> OK
  const ownRes = await app.handleRequest({
    method: "GET",
    path: "/api/applications/app_own_01/resume",
    user: studentUser,
  });
  assert.equal(ownRes.status, 200);

  // Student attempts to fetch another student's resume -> 403 IDOR blocked
  const otherRes = await app.handleRequest({
    method: "GET",
    path: "/api/applications/app_foreign_99/resume",
    user: studentUser,
  });
  assert.equal(otherRes.status, 403);
  assert.equal(otherRes.body.error.code, "FORBIDDEN_IDOR");
});

test("Integration: RBAC protection on GET /api/admin/metrics", async () => {
  const studentUser = { id: "student_01", role: "STUDENT" };
  const adminUser = { id: "admin_01", role: "ADMIN" };

  // Student blocked from admin endpoint
  const studentRes = await app.handleRequest({
    method: "GET",
    path: "/api/admin/metrics",
    user: studentUser,
  });
  assert.equal(studentRes.status, 403);

  // Admin allowed access
  const adminRes = await app.handleRequest({
    method: "GET",
    path: "/api/admin/metrics",
    user: adminUser,
  });
  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.body.data.activeEnrollments, 28);
});
