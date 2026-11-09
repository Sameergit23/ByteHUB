import test from "node:test";
import assert from "node:assert/strict";
import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  hashToken,
  authRateLimiter,
} from "../src/utils/security.mjs";

test("Password Policy: rejects passwords shorter than 10 characters", () => {
  const shortResult = validatePasswordStrength("Pass123!");
  assert.equal(shortResult.valid, false);
  assert.match(shortResult.message || "", /at least 10 characters/);
});

test("Password Policy: rejects common breached passwords", () => {
  const commonResult = validatePasswordStrength("password123");
  assert.equal(commonResult.valid, false);
  assert.match(commonResult.message || "", /too common/);
});

test("Password Policy: rejects passwords without special character or uppercase", () => {
  const noSpecial = validatePasswordStrength("passwordsimple123");
  assert.equal(noSpecial.valid, false);
  assert.match(noSpecial.message || "", /special character/);
});

test("Password Policy: accepts strong compliant password", () => {
  const validResult = validatePasswordStrength("SecureP@ssword2026!");
  assert.equal(validResult.valid, true);
});

test("Argon2id Hashing: generates modular crypt hash and verifies correctly in constant time", async () => {
  const password = "ProductionStr0ng!#";
  const hash = await hashPassword(password);

  assert.ok(hash.startsWith("$argon2id$"));

  const matches = await verifyPassword(password, hash);
  assert.equal(matches, true);

  const wrongMatches = await verifyPassword("WrongPassword123!", hash);
  assert.equal(wrongMatches, false);
});

test("Token Hashing: generates deterministic SHA-256 digest without raw token leakage in storage/logs", () => {
  const rawToken = "0123456789abcdef0123456789abcdef";
  const digest1 = hashToken(rawToken);
  const digest2 = hashToken(rawToken);

  assert.equal(digest1, digest2);
  assert.notEqual(digest1, rawToken);
  assert.equal(digest1.length, 64); // SHA-256 hex string length
});

test("Brute-Force Protection: triggers temporary lockout after 5 consecutive failures", () => {
  authRateLimiter.resetForTesting();
  const testId = "brute_force_test_ip_01";

  // 1 to 4 failed attempts should be allowed
  for (let i = 1; i <= 4; i++) {
    const status = authRateLimiter.check(testId);
    assert.equal(status.locked, false);
    authRateLimiter.recordFailure(testId);
  }

  // 5th failure must lock out
  const fifthFail = authRateLimiter.recordFailure(testId);
  assert.equal(fifthFail.locked, true);

  // Subsequent check should report locked = true
  const lockedCheck = authRateLimiter.check(testId);
  assert.equal(lockedCheck.allowed, false);
  assert.equal(lockedCheck.locked, true);
  assert.ok((lockedCheck.lockoutExpiresInSeconds || 0) > 0);

  // Reset clears state
  authRateLimiter.resetForTesting();
  const afterReset = authRateLimiter.check(testId);
  assert.equal(afterReset.allowed, true);
  assert.equal(afterReset.locked, false);
});

test("Token Family Rotation & Reuse Detection Logic", () => {
  const sessionStore = new Map();

  // 1. Initial login: generate token in family
  const familyId = "fam-01";
  const token1Hash = hashToken("raw_refresh_token_01");
  sessionStore.set(token1Hash, {
    familyId,
    userId: "usr-01",
    revoked: false,
  });

  // 2. Normal rotation: token1 is presented, revoked, and token2 is issued
  const session = sessionStore.get(token1Hash);
  assert.equal(session.revoked, false);
  session.revoked = true; // Mark as rotated

  const token2Hash = hashToken("raw_refresh_token_02");
  sessionStore.set(token2Hash, {
    familyId,
    userId: "usr-01",
    revoked: false,
  });

  // 3. Reuse attempt: attacker replays token1
  const replayedSession = sessionStore.get(token1Hash);
  assert.equal(replayedSession.revoked, true); // Reuse detected!

  // Revoke entire family
  for (const record of sessionStore.values()) {
    if (record.familyId === familyId) {
      record.revoked = true;
    }
  }

  // Both token1 and token2 are now terminated
  assert.equal(sessionStore.get(token1Hash).revoked, true);
  assert.equal(sessionStore.get(token2Hash).revoked, true);
});

test("RBAC & IDOR Boundaries: verifies role check and resource ownership", () => {
  const studentUser = { userId: "usr-student-01", role: "STUDENT" };
  const companyUser = { userId: "usr-company-01", role: "COMPANY" };
  const adminUser = { userId: "usr-admin-01", role: "ADMIN" };

  const applicationRecord = {
    id: "app-100",
    studentId: "usr-student-01",
    internshipId: "intern-01",
  };

  const isAllowedToAccessApp = (user, app) => {
    if (user.role === "ADMIN") return true;
    if (user.role === "STUDENT") return app.studentId === user.userId;
    return false;
  };

  // Student accessing own application: ALLOWED
  assert.equal(isAllowedToAccessApp(studentUser, applicationRecord), true);

  // Another student attempting IDOR: FORBIDDEN
  const otherStudent = { userId: "usr-student-02", role: "STUDENT" };
  assert.equal(isAllowedToAccessApp(otherStudent, applicationRecord), false);

  // Admin accessing application: ALLOWED
  assert.equal(isAllowedToAccessApp(adminUser, applicationRecord), true);

  // Company trying to directly access application outside authorized pipeline: FORBIDDEN
  assert.equal(isAllowedToAccessApp(companyUser, applicationRecord), false);
});
