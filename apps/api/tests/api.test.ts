import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("ByteHUB Architecture & API Test Suite", () => {
  it("GET /health returns 200 with status ok and uptime", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(["UP", "ok"]).toContain(res.body.status);
    expect(res.body.service).toBe("bytehub-api");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /api/health returns 200 and passes through healthRouter", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(["UP", "ok"]).toContain(res.body.status);
  });

  it("POST /api/auth/register fails with 400 and consistent error JSON format", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "invalid-email",
      password: "short",
      name: "",
      role: "INVALID",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/auth/me rejects unauthenticated request with consistent 401 error format", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Request includes X-Request-Id in response headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});
