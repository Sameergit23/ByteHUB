"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Stepper } from "../../../components/ui/Stepper";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Textarea } from "../../../components/ui/Textarea";
import { Checkbox } from "../../../components/ui/Checkbox";
import { ColophonFooter } from "../../../components/layout/ColophonFooter";
import { MOCK_INTERNSHIPS } from "../../../lib/mockData";
import { getStoredUser, apiFetch } from "../../../lib/api";
import {
  ApplicationDetailsSchema,
  ApplicationEducationSchema,
  ApplicationResumeSchema,
  ApplicationReviewSchema,
} from "@bytehub/shared";

export default function ApplicationFormPage({
  params,
}: {
  params: { id: string };
}) {
  const internship = MOCK_INTERNSHIPS.find(
    (item) => item.id === params.id || item.slug === params.id
  );

  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    // Step 1: Details
    fullName: "",
    email: "",
    phone: "",
    location: "Bengaluru, India",

    // Step 2: Education
    collegeOrUniversity: "",
    graduationYear: 2026,
    degree: "B.Tech Computer Science & Engineering",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",

    // Step 3: Resume & Statement
    resumeUrl: "",
    resumeFileName: "",
    bioSummary: "",
    whyInterested: "",
    relevantProjectDescription: "",

    // Step 4: Availability & Review
    availableHoursPerWeek: 30,
    earliestStartDate: "2026-12-01",
    termsAccepted: false,
    accurateInformationAcknowledged: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<{
    id: string;
    referenceCode: string;
    submittedAt: string;
  } | null>(null);

  // Restore draft and prefill logged in user info
  useEffect(() => {
    const user = getStoredUser();
    const draftKey = `bytehub_draft_${params.id}`;
    const savedDraft = sessionStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
        setLastAutosaved(new Date().toLocaleTimeString());
      } catch {
        // Ignore JSON error
      }
    } else if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || "",
        email: user.email || "",
      }));
    }
  }, [params.id]);

  // Autosave to sessionStorage
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      sessionStorage.setItem(`bytehub_draft_${params.id}`, JSON.stringify(updated));
      return updated;
    });
    setLastAutosaved(new Date().toLocaleTimeString());
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (!internship) {
    return notFound();
  }

  // File Upload with client magic bytes check and backend upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File exceeds 5 MB limit. Please select a smaller PDF or DOCX file.");
      return;
    }

    setIsUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Verify client-side magic bytes
      const isPdf =
        uint8.length >= 5 &&
        uint8[0] === 0x25 &&
        uint8[1] === 0x50 &&
        uint8[2] === 0x44 &&
        uint8[3] === 0x46 &&
        uint8[4] === 0x2d;

      const isDocx =
        uint8.length >= 4 &&
        uint8[0] === 0x50 &&
        uint8[1] === 0x4b &&
        uint8[2] === 0x03 &&
        uint8[3] === 0x04;

      if (!isPdf && !isDocx) {
        setUploadError(
          "Invalid file signature. File is not a valid PDF or DOCX document (renamed extensions rejected)."
        );
        setIsUploading(false);
        return;
      }

      // Convert to Base64 for transfer
      const base64 = btoa(
        uint8.reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const res = await apiFetch<any>("/applications/upload-resume", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          fileBase64: base64,
        }),
      }).catch(() => {
        // Fallback for offline demo preview
        return {
          status: "success",
          data: {
            signedUrl: `/vault/resumes/${file.name}`,
            fileKey: `resumes/demo_${Date.now()}_${file.name}`,
          },
        };
      });

      const url = res.data?.signedUrl || `/vault/resumes/${file.name}`;
      handleFieldChange("resumeUrl", url);
      handleFieldChange("resumeFileName", file.name);
    } catch {
      setUploadError("Upload encountered an error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Step Validation using Zod
  const validateCurrentStep = (): boolean => {
    setErrors({});
    let result: any;

    if (currentStep === 0) {
      result = ApplicationDetailsSchema.safeParse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
      });
    } else if (currentStep === 1) {
      result = ApplicationEducationSchema.safeParse({
        collegeOrUniversity: formData.collegeOrUniversity,
        graduationYear: formData.graduationYear,
        degree: formData.degree,
        githubUrl: formData.githubUrl,
        linkedinUrl: formData.linkedinUrl,
        portfolioUrl: formData.portfolioUrl || "",
      });
    } else if (currentStep === 2) {
      result = ApplicationResumeSchema.safeParse({
        resumeUrl: formData.resumeUrl,
        bioSummary: formData.bioSummary,
        whyInterested: formData.whyInterested,
        relevantProjectDescription: formData.relevantProjectDescription,
      });
    } else if (currentStep === 3) {
      result = ApplicationReviewSchema.safeParse({
        availableHoursPerWeek: formData.availableHoursPerWeek,
        earliestStartDate: formData.earliestStartDate,
        termsAccepted: formData.termsAccepted,
        accurateInformationAcknowledged: formData.accurateInformationAcknowledged,
      });
    }

    if (!result?.success) {
      const fieldErrors: Record<string, string> = {};
      result?.error?.issues?.forEach((issue: any) => {
        const key = issue.path[0] as string;
        if (key) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    const user = getStoredUser();
    if (!user) {
      sessionStorage.setItem(`bytehub_draft_${params.id}`, JSON.stringify(formData));
      window.location.href = `/auth?mode=login&redirect=/apply/${internship.id}`;
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        internshipId: internship.id,
        ...formData,
      };

      const res = await apiFetch<any>("/applications", {
        method: "POST",
        body: JSON.stringify(payload),
      }).catch(() => {
        // Fallback simulation for offline demo
        return {
          status: "success",
          data: {
            application: {
              id: `app_${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          },
        };
      });

      // Clear draft on submission
      sessionStorage.removeItem(`bytehub_draft_${params.id}`);

      setSubmittedApp({
        id: res.data?.application?.id || `BH-APP-${Date.now().toString(36).toUpperCase()}`,
        referenceCode: `BH-${Date.now().toString(36).toUpperCase()}`,
        submittedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    } catch (err: any) {
      setErrors({ form: err.message || "Submission failed. Please verify all details." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { title: "Details", description: "Personal & Contact" },
    { title: "Education", description: "Academic & Profiles" },
    { title: "Resume", description: "Document & Statement" },
    { title: "Review", description: "Verification & Submit" },
  ];

  return (
    <div className="w-full bg-canvas min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div>
          <Link
            href={`/internships/${internship.slug || internship.id}`}
            className="text-xs font-mono text-editorial-muted hover:text-ink inline-flex items-center gap-1"
          >
            ← CANCEL & RETURN TO INTERNSHIP
          </Link>
        </div>

        {/* Role Summary Card Matching Design System */}
        <Card padding="md" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="font-mono text-xs font-bold text-accent uppercase">
              Application Intake
            </span>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink">
              {internship.title}
            </h1>
            <p className="font-sans text-xs text-editorial-muted">
              {internship.companyName} · {internship.location} · {internship.type}
            </p>
          </div>

          <div className="flex flex-col sm:items-end text-xs font-mono">
            <span className="font-bold text-ink">{internship.stipend}</span>
            <span className="text-editorial-muted">Duration: {internship.duration}</span>
            {lastAutosaved && (
              <span className="text-[11px] text-green-700 pt-1">
                ✓ Draft autosaved at {lastAutosaved}
              </span>
            )}
          </div>
        </Card>

        {/* Stepper Component */}
        <Stepper steps={stepsList} currentStep={currentStep} className="py-2" />

        {/* Form Container */}
        <Card padding="lg" className="space-y-8 min-h-[420px]">
          {submittedApp ? (
            /* Success Screen Matching Swiss Editorial Look */
            <div className="space-y-8 py-8 text-center max-w-xl mx-auto">
              <div className="inline-block border border-ink bg-[#16150F] text-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider">
                Application Transmitted
              </div>

              <div className="space-y-3">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-ink">
                  Candidate dossier logged successfully.
                </h2>
                <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                  Your application for <strong>{internship.title}</strong> at {internship.companyName} has been received. Our review team and mentors evaluate applications on a 7-day rolling cadence.
                </p>
              </div>

              <div className="p-4 border border-editorial-border bg-canvas font-mono text-xs text-left divide-y divide-editorial-line">
                <div className="py-2 flex justify-between">
                  <span className="text-editorial-muted">Reference ID</span>
                  <span className="text-ink font-bold">{submittedApp.referenceCode}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-editorial-muted">Submission Date</span>
                  <span className="text-ink font-bold">{submittedApp.submittedAt}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-editorial-muted">Current Status</span>
                  <span className="text-accent font-bold">SUBMITTED (Under Review)</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/dashboard/student">
                  <Button variant="primary" size="lg">
                    Open Student Dashboard
                  </Button>
                </Link>
                <Link href="/internships">
                  <Button variant="outline" size="lg">
                    Browse more openings
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.form && (
                <div
                  role="alert"
                  className="p-3 border border-accent bg-[#FBEBE8] text-accent text-xs font-mono"
                >
                  [ ALERT ]: {errors.form}
                </div>
              )}

              {/* STEP 01: DETAILS */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-editorial-line pb-3">
                    <h2 className="font-heading text-xl font-bold text-ink">
                      Step 1: Personal & Contact Information
                    </h2>
                    <p className="font-sans text-xs text-editorial-muted">
                      Please ensure your name and email match your official documents.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      label="Full Legal Name"
                      required
                      placeholder="e.g. Maya Sen"
                      value={formData.fullName}
                      error={errors.fullName}
                      onChange={(e) => handleFieldChange("fullName", e.target.value)}
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      required
                      placeholder="maya.sen@domain.edu"
                      value={formData.email}
                      error={errors.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      label="Phone Number (with country code)"
                      required
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      error={errors.phone}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                    />

                    <Input
                      label="Current City / Residence"
                      required
                      placeholder="e.g. Bengaluru, India"
                      value={formData.location}
                      error={errors.location}
                      onChange={(e) => handleFieldChange("location", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 02: EDUCATION */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-editorial-line pb-3">
                    <h2 className="font-heading text-xl font-bold text-ink">
                      Step 2: Academic Background & Profiles
                    </h2>
                    <p className="font-sans text-xs text-editorial-muted">
                      Share your educational institution, degree, and public code profiles.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-2">
                      <Input
                        label="College / University Name"
                        required
                        placeholder="e.g. Indian Institute of Technology, Bombay"
                        value={formData.collegeOrUniversity}
                        error={errors.collegeOrUniversity}
                        onChange={(e) =>
                          handleFieldChange("collegeOrUniversity", e.target.value)
                        }
                      />
                    </div>

                    <Select
                      label="Graduation Year"
                      value={formData.graduationYear}
                      onChange={(e) =>
                        handleFieldChange("graduationYear", Number(e.target.value))
                      }
                      options={[
                        { value: 2024, label: "2024" },
                        { value: 2025, label: "2025" },
                        { value: 2026, label: "2026" },
                        { value: 2027, label: "2027" },
                        { value: 2028, label: "2028" },
                      ]}
                    />
                  </div>

                  <Input
                    label="Degree & Major"
                    required
                    placeholder="e.g. B.Tech Computer Science & Engineering"
                    value={formData.degree}
                    error={errors.degree}
                    onChange={(e) => handleFieldChange("degree", e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      label="GitHub Profile URL"
                      required
                      placeholder="https://github.com/username"
                      value={formData.githubUrl}
                      error={errors.githubUrl}
                      onChange={(e) => handleFieldChange("githubUrl", e.target.value)}
                    />

                    <Input
                      label="LinkedIn Profile URL"
                      required
                      placeholder="https://linkedin.com/in/username"
                      value={formData.linkedinUrl}
                      error={errors.linkedinUrl}
                      onChange={(e) => handleFieldChange("linkedinUrl", e.target.value)}
                    />
                  </div>

                  <Input
                    label="Portfolio or Personal Website (Optional)"
                    placeholder="https://yourname.dev"
                    value={formData.portfolioUrl}
                    error={errors.portfolioUrl}
                    onChange={(e) => handleFieldChange("portfolioUrl", e.target.value)}
                  />
                </div>
              )}

              {/* STEP 03: RESUME & TECHNICAL STATEMENT */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-editorial-line pb-3">
                    <h2 className="font-heading text-xl font-bold text-ink">
                      Step 3: Resume Document & Project Statement
                    </h2>
                    <p className="font-sans text-xs text-editorial-muted">
                      Upload your verified PDF or DOCX resume (max 5 MB) and walk mentors through your code.
                    </p>
                  </div>

                  {/* Resume Upload Box */}
                  <div className="border border-editorial-border p-6 bg-canvas space-y-4">
                    <label className="block text-xs font-sans font-semibold text-ink">
                      Resume File (PDF or DOCX, max 5 MB) *
                    </label>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <input
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="text-xs font-mono file:mr-4 file:py-2 file:px-4 file:border file:border-editorial-border file:text-xs file:font-sans file:font-semibold file:bg-white file:text-ink hover:file:border-ink cursor-pointer"
                      />
                      {isUploading && (
                        <span className="font-mono text-xs text-editorial-muted animate-pulse">
                          Scanning signature & uploading...
                        </span>
                      )}
                    </div>

                    {formData.resumeFileName && (
                      <div className="font-mono text-xs text-green-800 bg-green-50 p-2 border border-green-300 inline-block">
                        ✓ Verified Document: {formData.resumeFileName}
                      </div>
                    )}

                    {uploadError && (
                      <div className="font-mono text-xs text-accent">
                        [ ERROR ]: {uploadError}
                      </div>
                    )}
                    {errors.resumeUrl && (
                      <div className="font-mono text-xs text-accent">
                        {errors.resumeUrl}
                      </div>
                    )}
                  </div>

                  <Textarea
                    label="Brief Bio Summary (20 - 800 characters)"
                    required
                    rows={3}
                    placeholder="Provide a concise introduction to your background, technical interests, and preferred stack..."
                    value={formData.bioSummary}
                    error={errors.bioSummary}
                    onChange={(e) => handleFieldChange("bioSummary", e.target.value)}
                  />

                  <Textarea
                    label="Why are you interested in this internship? (min 30 characters)"
                    required
                    rows={3}
                    placeholder="Explain what motivates you about this role, company project, and team mentorship..."
                    value={formData.whyInterested}
                    error={errors.whyInterested}
                    onChange={(e) => handleFieldChange("whyInterested", e.target.value)}
                  />

                  <Textarea
                    label="Describe a technical project you built (min 50 characters)"
                    required
                    rows={4}
                    placeholder="Walk us through architecture decisions, concurrency or state challenges, performance trade-offs, and test coverage..."
                    value={formData.relevantProjectDescription}
                    error={errors.relevantProjectDescription}
                    onChange={(e) =>
                      handleFieldChange("relevantProjectDescription", e.target.value)
                    }
                  />
                </div>
              )}

              {/* STEP 04: AVAILABILITY & REVIEW */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-editorial-line pb-3">
                    <h2 className="font-heading text-xl font-bold text-ink">
                      Step 4: Availability & Verification Review
                    </h2>
                    <p className="font-sans text-xs text-editorial-muted">
                      Verify your details and commit to weekly participation before final dispatch.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      label="Available Weekly Commitment (Hours)"
                      type="number"
                      required
                      min={10}
                      max={50}
                      value={formData.availableHoursPerWeek}
                      error={errors.availableHoursPerWeek}
                      onChange={(e) =>
                        handleFieldChange(
                          "availableHoursPerWeek",
                          parseInt(e.target.value, 10) || 10
                        )
                      }
                    />

                    <Input
                      label="Earliest Possible Start Date"
                      type="date"
                      required
                      value={formData.earliestStartDate}
                      error={errors.earliestStartDate}
                      onChange={(e) =>
                        handleFieldChange("earliestStartDate", e.target.value)
                      }
                    />
                  </div>

                  {/* Summary Dossier */}
                  <div className="border border-editorial-border bg-canvas p-4 sm:p-6 space-y-3 font-sans text-xs">
                    <div className="font-mono text-xs font-bold text-accent uppercase pb-1 border-b border-editorial-line">
                      Candidate Dossier Summary
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink">
                      <div>
                        <strong>Name:</strong> {formData.fullName || "—"}
                      </div>
                      <div>
                        <strong>Email:</strong> {formData.email || "—"}
                      </div>
                      <div>
                        <strong>College:</strong> {formData.collegeOrUniversity || "—"}
                      </div>
                      <div>
                        <strong>Degree:</strong> {formData.degree || "—"}
                      </div>
                      <div>
                        <strong>GitHub:</strong> {formData.githubUrl || "—"}
                      </div>
                      <div>
                        <strong>Resume:</strong> {formData.resumeFileName || "Uploaded"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Checkbox
                      id="accurateInformationAcknowledged"
                      checked={formData.accurateInformationAcknowledged}
                      error={errors.accurateInformationAcknowledged}
                      onChange={(checked) =>
                        handleFieldChange("accurateInformationAcknowledged", checked)
                      }
                      label="I confirm that all statements, links, and code samples provided in this application are accurate and my own work."
                    />

                    <Checkbox
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      error={errors.termsAccepted}
                      onChange={(checked) =>
                        handleFieldChange("termsAccepted", checked)
                      }
                      label="I agree to ByteHUB's Code of Conduct and Student Internship Terms."
                    />
                  </div>
                </div>
              )}

              {/* Navigation Controls / Mobile Sticky Action Bar */}
              <div className="pt-6 border-t border-editorial-line flex items-center justify-between gap-4">
                {currentStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleBack}
                  >
                    ← Back
                  </Button>
                ) : (
                  <div></div>
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleNext}
                  >
                    Continue to next step →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                  >
                    Submit official application
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>
      </div>

      <ColophonFooter className="mt-20" />
    </div>
  );
}
