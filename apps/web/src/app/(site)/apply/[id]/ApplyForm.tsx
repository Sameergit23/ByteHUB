"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Stepper } from "../../../../components/ui/Stepper";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";
import { Select } from "../../../../components/ui/Select";
import { Textarea } from "../../../../components/ui/Textarea";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { Combobox } from "../../../../components/ui/Combobox";
import { COLLEGES } from "../../../../lib/colleges";
import {
  COUNTRIES,
  findCountry,
  fullPhone,
  phoneProblem,
  splitPhone,
} from "../../../../lib/countries";
import { ColophonFooter } from "../../../../components/layout/ColophonFooter";
import type { InternshipItem } from "../../../../lib/catalog";
import {
  getStoredUser,
  apiFetch,
  ApiError,
  ApiEnvelope,
  StoredUser,
  redirectToLogin,
} from "../../../../lib/api";
import { payInternshipFee } from "../../../../lib/cashfree";
import { formatMoney } from "../../../../lib/format";
import {
  FormAlert,
  describeError,
  makeAlert,
  validationAlert,
  type AlertInfo,
} from "../../../../components/ui/FormAlert";

/** Result shape shared by every step schema's safeParse(). */
type StepValidation =
  | { success: true }
  | {
      success: false;
      error: { issues: { path: PropertyKey[]; message: string }[] };
    };
import {
  ApplicationDetailsSchema,
  ApplicationEducationSchema,
  ApplicationResumeSchema,
  ApplicationReviewSchema,
} from "@bytehub/shared";

export function ApplyForm({ internship }: { internship: InternshipItem }) {
  const draftKey = `bytehub_draft_${internship.id}`;
  const returnPath = `/apply/${internship.slug}`;

  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState<StoredUser | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: Details
    fullName: "",
    email: "",
    phoneCountry: "IN",
    phoneNumber: "",
    country: "India",
    pincode: "",
    locality: "",
    city: "",
    state: "",
    addressLine: "",

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
  const [uploadError, setUploadError] = useState<AlertInfo | null>(null);
  // Problems with the whole submission (wrong account type, server, network).
  const [formAlert, setFormAlert] = useState<AlertInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<{
    id: string;
    referenceCode: string;
    submittedAt: string;
  } | null>(null);

  // Registration fee: the application is saved first, then paid for through Cashfree.
  const feeAmount = internship.registrationFeeAmount;
  const hasFee = feeAmount > 0;
  const feeLabel = formatMoney(feeAmount, "INR");
  const [feeDue, setFeeDue] = useState<{ id: string; createdAt?: string } | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [feeAlert, setFeeAlert] = useState<AlertInfo | null>(null);
  const [paidFee, setPaidFee] = useState<{
    orderId: string;
    amount: number;
    currency: string;
  } | null>(null);

  // Restore draft and prefill logged in user info
  useEffect(() => {
    const user = getStoredUser();
    setUser(user);
    const savedDraft = sessionStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        // Drafts saved by the older form had a single phone and location line.
        const { phone, location, ...parsed } = JSON.parse(savedDraft);
        const oldPhone =
          typeof phone === "string" && !parsed.phoneNumber ? splitPhone(phone) : null;
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          ...(oldPhone
            ? { phoneCountry: oldPhone.iso, phoneNumber: oldPhone.number }
            : {}),
          ...(typeof location === "string" && !parsed.city ? { city: location } : {}),
        }));
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
  }, [draftKey]);

  // PIN code lookup: a valid Indian PIN fills in city and state and lists the areas it covers.
  const [pinLookup, setPinLookup] = useState<{
    status: "idle" | "loading" | "found" | "not_found" | "error";
    localities: string[];
    place?: string;
  }>({ status: "idle", localities: [] });
  const lastPin = useRef("");

  useEffect(() => {
    const pin = formData.pincode.trim();
    if (formData.country !== "India" || !/^[1-9][0-9]{5}$/.test(pin)) {
      lastPin.current = "";
      setPinLookup({ status: "idle", localities: [] });
      return;
    }
    if (pin === lastPin.current) return;
    lastPin.current = pin;
    let cancelled = false;
    setPinLookup({ status: "loading", localities: [] });
    const timer = window.setTimeout(() => {
      apiFetch<ApiEnvelope<{ city: string; state: string; localities: string[] }>>(
        `/meta/pincode/${pin}`
      )
        .then((res) => {
          if (cancelled || !res.data) return;
          const { city, state, localities } = res.data;
          setPinLookup({ status: "found", localities, place: `${city}, ${state}` });
          setFormData((prev) => {
            const keepLocality = localities.includes(prev.locality);
            const updated = {
              ...prev,
              city: city || prev.city,
              state: state || prev.state,
              locality: keepLocality
                ? prev.locality
                : localities.length === 1
                  ? localities[0]!
                  : "",
            };
            sessionStorage.setItem(draftKey, JSON.stringify(updated));
            return updated;
          });
          setErrors((prev) => {
            const next = { ...prev };
            delete next.city;
            delete next.state;
            delete next.pincode;
            return next;
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setPinLookup({
            status: err instanceof ApiError && err.status === 404 ? "not_found" : "error",
            localities: [],
          });
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [formData.pincode, formData.country, draftKey]);

  // Uploading and submitting need a signed-in student; the draft survives the round trip.
  const goToLogin = () => {
    sessionStorage.setItem(draftKey, JSON.stringify(formData));
    window.location.href = `/auth?mode=login&redirect=${encodeURIComponent(returnPath)}`;
  };

  // Autosave to sessionStorage
  const handleFieldChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      sessionStorage.setItem(draftKey, JSON.stringify(updated));
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

  // File Upload with client magic bytes check and backend upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!getStoredUser()) {
      goToLogin();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(
        validationAlert(
          "Choose a PDF or Word (.docx) file under 5 MB.",
          "This file is too large"
        )
      );
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
          validationAlert(
            "Upload a real PDF or Word (.docx) file. Renamed files are rejected.",
            "This isn't a PDF or Word file"
          )
        );
        setIsUploading(false);
        return;
      }

      // Convert to Base64 for transfer
      const base64 = btoa(
        uint8.reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const res = await apiFetch<ApiEnvelope<{ fileKey?: string }>>(
        "/applications/upload-resume",
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            fileBase64: base64,
          }),
        }
      );

      const fileKey = res.data?.fileKey;
      if (!fileKey) {
        throw new Error("The server did not confirm the upload.");
      }

      // The vault key (not a temporary link) is what gets attached to the application.
      handleFieldChange("resumeUrl", fileKey);
      handleFieldChange("resumeFileName", file.name);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        goToLogin();
        return;
      }
      handleFieldChange("resumeUrl", "");
      handleFieldChange("resumeFileName", "");
      setUploadError(describeError(err, "Upload failed. Please try again."));
    } finally {
      setIsUploading(false);
    }
  };

  // Step Validation using Zod
  const validateCurrentStep = (): boolean => {
    setErrors({});
    let result: StepValidation | undefined;

    if (currentStep === 0) {
      result = ApplicationDetailsSchema.safeParse({
        fullName: formData.fullName,
        email: formData.email,
        phone: fullPhone(formData.phoneCountry, formData.phoneNumber),
        country: formData.country,
        pincode: formData.pincode,
        addressLine: formData.addressLine,
        locality: formData.locality,
        city: formData.city,
        state: formData.state,
      });
      // Checks the shared rules can't express: phone length per country, PIN, city and state.
      const extra: Record<string, string> = {};
      const phoneIssue = phoneProblem(formData.phoneCountry, formData.phoneNumber);
      if (phoneIssue) extra.phone = phoneIssue;
      if (
        formData.country === "India" &&
        !/^[1-9][0-9]{5}$/.test(formData.pincode.trim())
      ) {
        extra.pincode = "Enter your 6-digit PIN code.";
      }
      if (formData.city.trim().length < 2) extra.city = "Enter your city or town.";
      if (formData.state.trim().length < 2) {
        extra.state =
          formData.country === "India"
            ? "Enter your state."
            : "Enter your state or region.";
      }
      if (Object.keys(extra).length) {
        const fieldErrors: Record<string, string> = { ...extra };
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            const key = issue.path[0] as string;
            if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
          });
        }
        setErrors(fieldErrors);
        return false;
      }
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

    if (result && !result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
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

  const showSubmitted = (application: { id: string; createdAt?: string }) => {
    setSubmittedApp({
      id: application.id,
      referenceCode: `BH-${String(application.id).slice(0, 8).toUpperCase()}`,
      submittedAt: new Date(application.createdAt || Date.now()).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      ),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startFeePayment = async (application: { id: string; createdAt?: string }) => {
    setIsPaying(true);
    setFeeAlert(null);
    let leavingPage = false;
    try {
      const result = await payInternshipFee(application.id);
      if (result.outcome === "redirecting") {
        // The browser is opening Cashfree's payment page; keep the button busy until it does.
        leavingPage = true;
        return;
      }
      if (result.outcome === "paid") {
        setPaidFee({
          orderId: result.orderId,
          amount: result.amount,
          currency: result.currency,
        });
        setFeeDue(null);
        showSubmitted(application);
      } else if (result.outcome === "no_fee_needed") {
        setFeeDue(null);
        showSubmitted(application);
      } else {
        setFeeAlert(
          makeAlert(
            "payment",
            "Payment not completed",
            `${result.reason ? `${result.reason}. ` : ""}No money was taken. Your application is saved: pay whenever you're ready, here or from your dashboard.`
          )
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin("/dashboard/student");
        return;
      }
      setFeeAlert(
        describeError(err, "The payment could not be started. Please try again.")
      );
    } finally {
      if (!leavingPage) setIsPaying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;
    setFormAlert(null);

    const currentUser = getStoredUser();
    if (!currentUser) {
      goToLogin();
      return;
    }
    if (currentUser.role === "COMPANY") {
      setFormAlert(
        makeAlert(
          "forbidden",
          "Company accounts can't apply",
          "Sign in with a student account to apply for internships."
        )
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // The API rejects unknown fields, so only the application fields themselves are sent.
      const {
        resumeFileName: _resumeFileName,
        phoneCountry,
        phoneNumber,
        ...applicationFields
      } = formData;
      const payload = {
        internshipId: internship.id,
        ...applicationFields,
        phone: fullPhone(phoneCountry, phoneNumber),
        location: [
          applicationFields.city,
          applicationFields.state || applicationFields.country,
        ]
          .filter(Boolean)
          .join(", "),
        graduationYear: Number(applicationFields.graduationYear),
        availableHoursPerWeek: Number(applicationFields.availableHoursPerWeek),
      };

      const res = await apiFetch<
        ApiEnvelope<{
          application?: { id: string; createdAt?: string };
          paymentRequired?: boolean;
        }>
      >("/applications", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const application = res.data?.application;
      if (!application?.id) {
        throw new Error("The server did not confirm your application. Please try again.");
      }

      // Clear draft only once the server has stored the application
      sessionStorage.removeItem(draftKey);

      if (res.data?.paymentRequired) {
        // Saved, but it only reaches the team once the registration fee is paid.
        setFeeDue({ id: application.id, createdAt: application.createdAt });
        window.scrollTo({ top: 0, behavior: "smooth" });
        await startFeePayment(application);
        return;
      }

      showSubmitted(application);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        goToLogin();
        return;
      }
      setFormAlert(
        describeError(err, "Your application could not be sent. Please try again.")
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { number: 1, label: "Details" },
    { number: 2, label: "Education" },
    { number: 3, label: "Resume" },
    { number: 4, label: "Review" },
  ];

  return (
    <div className="w-full bg-canvas min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div>
          <Link
            href={`/internships/${internship.slug}`}
            className="text-xs font-mono text-editorial-muted hover:text-ink inline-flex items-center gap-1"
          >
            ← CANCEL & RETURN TO INTERNSHIP
          </Link>
        </div>

        {/* Role Summary Card Matching Design System */}
        <Card
          padding="md"
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
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
            {hasFee && (
              <span className="text-editorial-muted">Registration fee: {feeLabel}</span>
            )}
            {lastAutosaved && (
              <span className="text-[11px] text-green-700 pt-1">
                ✓ Draft autosaved at {lastAutosaved}
              </span>
            )}
          </div>
        </Card>

        {/* Stepper Component */}
        <Stepper steps={stepsList} currentStep={currentStep + 1} className="py-2" />

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
                  Your application for <strong>{internship.title}</strong> at{" "}
                  {internship.companyName} has been received. Our review team and mentors
                  evaluate applications on a 7-day rolling cadence.
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
                {paidFee && (
                  <div className="py-2 flex justify-between gap-4">
                    <span className="text-editorial-muted">Registration fee</span>
                    <span className="text-ink font-bold text-right">
                      {formatMoney(paidFee.amount, paidFee.currency)} paid ·{" "}
                      {paidFee.orderId}
                    </span>
                  </div>
                )}
                <div className="py-2 flex justify-between">
                  <span className="text-editorial-muted">Current Status</span>
                  <span className="text-accent font-bold">SUBMITTED (Under Review)</span>
                </div>
              </div>

              {paidFee && (
                <p className="font-sans text-xs text-editorial-muted">
                  A receipt is on its way to your email. If you are not selected, the fee
                  is refunded in full.
                </p>
              )}

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
          ) : feeDue ? (
            <div className="space-y-8 py-8 text-center max-w-xl mx-auto animate-fadeIn">
              <div className="inline-block border border-accent text-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider">
                Last step: registration fee
              </div>

              <div className="space-y-3">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-ink">
                  Pay {feeLabel} to send your application.
                </h2>
                <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                  Your application for <strong>{internship.title}</strong> is saved. It
                  goes to our review team as soon as the registration fee is paid.
                </p>
              </div>

              <FormAlert alert={feeAlert} onDismiss={() => setFeeAlert(null)} />

              <div className="p-4 border border-editorial-border bg-canvas font-mono text-xs text-left divide-y divide-editorial-line">
                <div className="py-2 flex justify-between gap-4">
                  <span className="text-editorial-muted">Registration fee</span>
                  <span className="text-ink font-bold">{feeLabel}</span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="text-editorial-muted">Pay with</span>
                  <span className="text-ink font-bold text-right">
                    UPI, cards or netbanking (Cashfree)
                  </span>
                </div>
                <div className="py-2 flex justify-between gap-4">
                  <span className="text-editorial-muted">If you are not selected</span>
                  <span className="text-ink font-bold">Full refund</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isPaying}
                  onClick={() => startFeePayment(feeDue)}
                >
                  {isPaying ? "Opening secure payment…" : `Pay ${feeLabel} securely`}
                </Button>
                <Link href="/dashboard/student">
                  <Button variant="outline" size="lg" disabled={isPaying}>
                    Pay later from dashboard
                  </Button>
                </Link>
              </div>

              <p className="font-sans text-xs text-editorial-muted">
                By paying you agree to our{" "}
                <Link href="/refund-policy" target="_blank" className="underline">
                  Refund Policy
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {!user && (
                <div className="p-3 border border-editorial-border bg-canvas text-xs font-sans text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span>
                    You need a student account to upload a resume and submit. Your draft
                    is saved in this browser tab.
                  </span>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="self-start sm:self-auto px-3 py-1.5 border border-ink text-xs font-semibold hover:bg-ink hover:text-canvas transition-colors"
                  >
                    Sign in to apply
                  </button>
                </div>
              )}

              <FormAlert alert={formAlert} onDismiss={() => setFormAlert(null)} />

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

                  {/* Phone: country code + number */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="phone-number"
                      className="block text-xs font-sans font-medium text-ink"
                    >
                      Mobile number
                      <span className="text-accent ml-1" aria-hidden="true">
                        *
                      </span>
                    </label>
                    {errors.phone && (
                      <p className="text-[11px] text-accent font-medium" role="alert">
                        {errors.phone}
                      </p>
                    )}
                    <div className="flex">
                      <select
                        aria-label="Country code"
                        value={formData.phoneCountry}
                        onChange={(e) =>
                          handleFieldChange("phoneCountry", e.target.value)
                        }
                        className="min-h-[44px] w-[7.5rem] shrink-0 border border-r-0 border-editorial-border bg-canvas px-2 text-sm text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-ink"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.iso} value={c.iso}>
                            {c.iso} {c.dial}
                          </option>
                        ))}
                      </select>
                      <input
                        id="phone-number"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder={
                          formData.phoneCountry === "IN" ? "98765 43210" : "Phone number"
                        }
                        value={formData.phoneNumber}
                        aria-invalid={Boolean(errors.phone)}
                        onChange={(e) => handleFieldChange("phoneNumber", e.target.value)}
                        className={`min-h-[44px] w-full min-w-0 border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-editorial-muted/70 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 ${
                          errors.phone
                            ? "border-accent"
                            : "border-editorial-border hover:border-ink focus-visible:border-ink"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-editorial-muted">
                      {findCountry(formData.phoneCountry).name} (
                      {findCountry(formData.phoneCountry).dial}). We only call about this
                      application.
                    </p>
                  </div>

                  {/* Address */}
                  <fieldset className="space-y-4 border border-editorial-border p-4 sm:p-5">
                    <legend className="px-1 text-xs font-sans font-semibold text-ink">
                      Where you live
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Country"
                        required
                        value={formData.country}
                        onChange={(e) => handleFieldChange("country", e.target.value)}
                        options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
                      />
                      <Input
                        label={
                          formData.country === "India"
                            ? "PIN code"
                            : "Postal code (optional)"
                        }
                        required={formData.country === "India"}
                        inputMode={formData.country === "India" ? "numeric" : "text"}
                        maxLength={formData.country === "India" ? 6 : 10}
                        autoComplete="postal-code"
                        placeholder={formData.country === "India" ? "e.g. 452001" : ""}
                        value={formData.pincode}
                        error={errors.pincode}
                        helperText={
                          formData.country !== "India"
                            ? undefined
                            : pinLookup.status === "loading"
                              ? "Looking up your PIN code…"
                              : pinLookup.status === "found"
                                ? `Found: ${pinLookup.place}`
                                : pinLookup.status === "not_found"
                                  ? "We couldn't find this PIN code. Check it, or type your city and state below."
                                  : pinLookup.status === "error"
                                    ? "PIN lookup isn't available right now. Type your city and state below."
                                    : "We fill in your city and state from it."
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            "pincode",
                            formData.country === "India"
                              ? e.target.value.replace(/[^0-9]/g, "")
                              : e.target.value
                          )
                        }
                      />
                    </div>

                    {formData.country === "India" && pinLookup.localities.length > 1 ? (
                      <Select
                        label="Area / locality (optional)"
                        value={formData.locality}
                        onChange={(e) => handleFieldChange("locality", e.target.value)}
                        options={[
                          { value: "", label: "Choose your area" },
                          ...pinLookup.localities.map((l) => ({ value: l, label: l })),
                        ]}
                      />
                    ) : (
                      <Input
                        label="Area / locality (optional)"
                        placeholder="e.g. Vijay Nagar"
                        value={formData.locality}
                        onChange={(e) => handleFieldChange("locality", e.target.value)}
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="City / town"
                        required
                        autoComplete="address-level2"
                        value={formData.city}
                        error={errors.city}
                        onChange={(e) => handleFieldChange("city", e.target.value)}
                      />
                      <Input
                        label={formData.country === "India" ? "State" : "State / region"}
                        required
                        autoComplete="address-level1"
                        value={formData.state}
                        error={errors.state}
                        onChange={(e) => handleFieldChange("state", e.target.value)}
                      />
                    </div>

                    <Input
                      label="House / street address (optional)"
                      autoComplete="street-address"
                      placeholder="e.g. 12, Scheme No. 54, AB Road"
                      value={formData.addressLine}
                      onChange={(e) => handleFieldChange("addressLine", e.target.value)}
                    />
                  </fieldset>
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
                      Share your educational institution, degree, and public code
                      profiles.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-2">
                      <Combobox
                        label="College / University"
                        required
                        placeholder="Start typing, e.g. SGSITS or IIT"
                        helperText="Pick from the list, or type your college if it isn't there."
                        options={COLLEGES}
                        value={formData.collegeOrUniversity}
                        error={errors.collegeOrUniversity}
                        onChange={(value) =>
                          handleFieldChange("collegeOrUniversity", value)
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
                      label="GitHub profile (optional)"
                      placeholder="https://github.com/username"
                      value={formData.githubUrl}
                      error={errors.githubUrl}
                      onChange={(e) => handleFieldChange("githubUrl", e.target.value)}
                    />

                    <Input
                      label="LinkedIn profile (optional)"
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
                      Upload your verified PDF or DOCX resume (max 5 MB) and walk mentors
                      through your code.
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

                    <FormAlert alert={uploadError} />
                    {errors.resumeUrl && (
                      <div className="font-mono text-xs text-accent">
                        {errors.resumeUrl}
                      </div>
                    )}
                  </div>

                  <p className="font-sans text-xs text-editorial-muted">
                    The questions below are optional, but a few lines help us understand
                    you better.
                  </p>

                  <Textarea
                    label="Brief bio (optional)"
                    rows={3}
                    placeholder="Provide a concise introduction to your background, technical interests, and preferred stack..."
                    value={formData.bioSummary}
                    error={errors.bioSummary}
                    onChange={(e) => handleFieldChange("bioSummary", e.target.value)}
                  />

                  <Textarea
                    label="Why are you interested in this internship? (optional)"
                    rows={3}
                    placeholder="Explain what motivates you about this role, company project, and team mentorship..."
                    value={formData.whyInterested}
                    error={errors.whyInterested}
                    onChange={(e) => handleFieldChange("whyInterested", e.target.value)}
                  />

                  <Textarea
                    label="A project you built (optional)"
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
                      Verify your details and commit to weekly participation before final
                      dispatch.
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
                        <strong>Phone:</strong>{" "}
                        {formData.phoneNumber
                          ? fullPhone(formData.phoneCountry, formData.phoneNumber)
                          : "—"}
                      </div>
                      <div>
                        <strong>Address:</strong>{" "}
                        {[
                          formData.addressLine,
                          formData.locality,
                          formData.city,
                          formData.state,
                          formData.pincode,
                          formData.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
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

                  {hasFee && (
                    <div className="p-4 border border-accent/40 bg-accent/5 font-sans text-xs text-ink leading-relaxed">
                      <strong>This internship has a {feeLabel} registration fee.</strong>{" "}
                      After you submit, you pay it securely with Cashfree (UPI, cards or
                      netbanking). Your application reaches our team once it is paid, and
                      the fee is refunded in full if you are not selected.
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <Checkbox
                      id="accurateInformationAcknowledged"
                      checked={formData.accurateInformationAcknowledged}
                      error={errors.accurateInformationAcknowledged}
                      onChange={(e) =>
                        handleFieldChange(
                          "accurateInformationAcknowledged",
                          e.target.checked
                        )
                      }
                      label="I confirm that all statements, links, and code samples provided in this application are accurate and my own work."
                    />

                    <Checkbox
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      error={errors.termsAccepted}
                      onChange={(e) =>
                        handleFieldChange("termsAccepted", e.target.checked)
                      }
                      label={
                        <>
                          I agree to ByteHUB&apos;s{" "}
                          <Link href="/terms" target="_blank" className="underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" target="_blank" className="underline">
                            Privacy Policy
                          </Link>
                          , including sharing this application with the company.
                        </>
                      }
                    />
                  </div>
                </div>
              )}

              {/* Navigation Controls / Mobile Sticky Action Bar */}
              <div className="pt-6 border-t border-editorial-line flex items-center justify-between gap-4">
                {currentStep > 0 ? (
                  <Button type="button" variant="outline" size="md" onClick={handleBack}>
                    ← Back
                  </Button>
                ) : (
                  <div></div>
                )}

                {/* Separate keys give each its own button element. Otherwise React turns the
                    clicked "Continue" into the submit button mid-click on step 3, and the
                    browser submits the form before the student sees the review step. */}
                {currentStep < 3 ? (
                  <Button
                    key="next"
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleNext}
                  >
                    Continue to next step →
                  </Button>
                ) : (
                  <Button
                    key="submit"
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                  >
                    {hasFee
                      ? `Submit and pay ${feeLabel}`
                      : "Submit official application"}
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
