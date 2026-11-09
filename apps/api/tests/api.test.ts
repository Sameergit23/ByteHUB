import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("ByteHUB API Suite", () => {
  it("GET /api/health returns 200 and healthy status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("bytehub-api");
  });

  it("POST /api/auth/register fails with 400 when fields are invalid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "bad-email",
      password: "123",
      name: "",
      role: "INVALID_ROLE",
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/training returns published training tracks", async () => {
    const res = await request(app).get("/api/training");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty("slug");
    expect(res.body.data[0]).toHaveProperty("priceINR");
  });

  it("GET /api/auth/me rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/applications rejects unauthenticated request with 401", async () => {
    const res = await request(app).post("/api/applications").send({});
    expect(res.status).toBe(401);
  });
});
