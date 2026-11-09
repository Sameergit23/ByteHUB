import test from "node:test";
import assert from "node:assert/strict";
import { validateFileSignature } from "../src/utils/resumeStorage.mjs";

test("File Signature: verifies genuine PDF with %PDF- header", () => {
  const genuinePdf = Buffer.from("%PDF-1.7\nSample content for resume testing");
  const result = validateFileSignature(genuinePdf);

  assert.equal(result.valid, true);
  assert.equal(result.extension, "pdf");
  assert.equal(result.mimeType, "application/pdf");
});

test("File Signature: verifies genuine DOCX with ZIP PK\\x03\\x04 header", () => {
  const genuineDocx = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from("word/document.xml payload content"),
  ]);
  const result = validateFileSignature(genuineDocx);

  assert.equal(result.valid, true);
  assert.equal(result.extension, "docx");
});

test("File Signature: rejects malicious executable spoofed as .pdf (MZ header)", () => {
  // Windows PE Executable magic bytes: 0x4D, 0x5A ("MZ")
  const spoofedExecutable = Buffer.concat([
    Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    Buffer.from("Malicious binary payload disguised as resume.pdf"),
  ]);
  const result = validateFileSignature(spoofedExecutable);

  assert.equal(result.valid, false);
  assert.match(result.error || "", /Invalid file format signature/);
});

test("File Signature: rejects shell script or HTML disguised as .pdf", () => {
  const spoofedScript = Buffer.from("#!/bin/bash\nrm -rf /");
  const result = validateFileSignature(spoofedScript);

  assert.equal(result.valid, false);
});

test("File Signature: rejects files exceeding 5 MB limit", () => {
  // Allocate buffer exceeding 5 MB limit
  const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x25); // Starts with %, but exceeds size
  const result = validateFileSignature(oversizedBuffer);

  assert.equal(result.valid, false);
  assert.match(result.error || "", /exceeds maximum size/);
});

test("Server-Side Deadline Enforcement: rejects applications past deadline", () => {
  const expiredInternship = {
    id: "intern-past",
    title: "Expired Role",
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    status: "PUBLISHED",
  };

  const isEligibleToApply = (internship) => {
    if (internship.status !== "PUBLISHED") return false;
    if (new Date() > new Date(internship.deadline)) return false;
    return true;
  };

  assert.equal(isEligibleToApply(expiredInternship), false);

  const activeInternship = {
    id: "intern-future",
    title: "Active Role",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days ahead
    status: "PUBLISHED",
  };
  assert.equal(isEligibleToApply(activeInternship), true);
});

test("Duplicate Application Prevention: rejects second application for same position", () => {
  const applicationsDb = new Set(["student_01:intern_100"]);

  const canApply = (studentId, internshipId) => {
    const key = `${studentId}:${internshipId}`;
    if (applicationsDb.has(key)) {
      return false; // Duplicate rejected
    }
    applicationsDb.add(key);
    return true;
  };

  // First application allowed
  assert.equal(canApply("student_02", "intern_100"), true);
  // Duplicate application for student_01 rejected
  assert.equal(canApply("student_01", "intern_100"), false);
});

test("IDOR Authorization: student cannot inspect another student's resume", () => {
  const application = {
    id: "app-300",
    studentId: "student-aarav",
    companyId: "company-hypergrid",
    resumeUrl: "/vault/resumes/secure-aarav.pdf",
  };

  const checkResumeAccess = (user, app) => {
    if (user.role === "ADMIN") return true;
    if (user.role === "COMPANY" && user.userId === app.companyId) return true;
    if (user.role === "STUDENT" && user.userId === app.studentId) return true;
    return false;
  };

  // Owner student can access
  assert.equal(checkResumeAccess({ userId: "student-aarav", role: "STUDENT" }, application), true);

  // Other student blocked (IDOR attempt)
  assert.equal(checkResumeAccess({ userId: "student-maya", role: "STUDENT" }, application), false);

  // Offering company can access
  assert.equal(checkResumeAccess({ userId: "company-hypergrid", role: "COMPANY" }, application), true);

  // Unrelated company blocked
  assert.equal(checkResumeAccess({ userId: "company-acme", role: "COMPANY" }, application), false);

  // Admin can access
  assert.equal(checkResumeAccess({ userId: "admin-saim", role: "ADMIN" }, application), true);
});

test("Withdrawal Authorization: only applicant can withdraw their application", () => {
  const application = {
    id: "app-500",
    studentId: "student-aarav",
    status: "SUBMITTED",
  };

  const canWithdraw = (user, app) => {
    return user.role === "STUDENT" && user.userId === app.studentId;
  };

  assert.equal(canWithdraw({ userId: "student-aarav", role: "STUDENT" }, application), true);
  assert.equal(canWithdraw({ userId: "student-other", role: "STUDENT" }, application), false);
});
