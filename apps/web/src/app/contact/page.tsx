"use client";

import React, { useState } from "react";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { ColophonFooter } from "../../components/layout/ColophonFooter";
import { apiFetch, ApiError } from "../../lib/api";
import { siteConfig } from "../../lib/siteConfig";

// Zod validation contract for Contact form
const contactSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  topic: z.enum([
    "Admissions & Cohorts",
    "Employer Partnerships",
    "Syllabus & Curriculum",
    "General Inquiry",
  ]),
  message: z.string().min(10, "Message must be at least 10 characters"),
  _hp: z.string().max(0, "Bot detected"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    email: "",
    topic: "Admissions & Cohorts",
    message: "",
    _hp: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "rate_limit";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setStatusMessage(null);

    // Rate limiting guard: prevent multiple submissions within 30 seconds
    const now = Date.now();
    if (lastSubmittedAt && now - lastSubmittedAt < 30000) {
      const waitSeconds = Math.ceil((30000 - (now - lastSubmittedAt)) / 1000);
      setStatusMessage({
        type: "rate_limit",
        text: `Rate limit reached. Please wait ${waitSeconds} seconds before submitting another inquiry.`,
      });
      return;
    }

    // Client-side Zod validation
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ContactFormData;
        if (path) fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Honeypot check - bot caught silently
    if (formData._hp) {
      setStatusMessage({
        type: "success",
        text: "Thank you. Your message has been received.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // The message is only reported as sent once the server has stored it.
      await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          topic: formData.topic,
          message: formData.message,
        }),
      });

      setLastSubmittedAt(Date.now());
      setStatusMessage({
        type: "success",
        text: "Thank you. Your message has been dispatched to our operations team. We typically respond within 24 business hours.",
      });
      setFormData({
        fullName: "",
        email: "",
        topic: "Admissions & Cohorts",
        message: "",
        _hp: "",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setStatusMessage({
          type: "rate_limit",
          text: "Too many messages sent from this connection. Please wait 15 minutes before trying again.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text:
            err instanceof ApiError && err.status === 400
              ? err.message
              : "Your message could not be sent. Please try again or email us directly.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Header Eyebrow & Title */}
        <div className="space-y-3">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
            Get in touch
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink">
            Contact our team
          </h1>
          <p className="font-sans text-sm sm:text-base text-editorial-muted max-w-2xl leading-relaxed">
            Have a question about upcoming cohorts, syllabus prerequisites, or hiring
            trained interns? Drop us a line below.
          </p>
        </div>

        {/* Two-Column Grid: Form on Left, Contact Desks on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <Card padding="lg">
              {statusMessage?.type === "success" ? (
                <div
                  role="status"
                  className="p-6 border border-ink bg-canvas space-y-3 font-sans"
                >
                  <div className="font-heading font-bold text-lg text-ink">
                    Message Dispatched
                  </div>
                  <p className="text-sm text-editorial-muted">{statusMessage.text}</p>
                  <button
                    type="button"
                    onClick={() => setStatusMessage(null)}
                    className="font-mono text-xs text-accent underline font-semibold"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {statusMessage?.type === "rate_limit" && (
                    <div
                      role="alert"
                      className="p-4 border border-accent bg-[#FBEBE8] text-accent text-xs font-mono"
                    >
                      {statusMessage.text}
                    </div>
                  )}

                  {/* Honeypot field (hidden from screen readers & sighted users) */}
                  <input
                    type="text"
                    name="_hp"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData._hp}
                    onChange={(e) => setFormData({ ...formData, _hp: e.target.value })}
                    className="sr-only"
                    aria-hidden="true"
                  />

                  <Input
                    label="Full Name"
                    required
                    placeholder="e.g. Saim Ansari"
                    value={formData.fullName}
                    error={errors.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    required
                    placeholder="saim@example.com"
                    value={formData.email}
                    error={errors.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />

                  <Select
                    label="Inquiry Topic"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        topic: e.target.value as ContactFormData["topic"],
                      })
                    }
                    options={[
                      {
                        value: "Admissions & Cohorts",
                        label: "Admissions & Cohorts",
                      },
                      {
                        value: "Employer Partnerships",
                        label: "Employer Partnerships",
                      },
                      {
                        value: "Syllabus & Curriculum",
                        label: "Syllabus & Curriculum",
                      },
                      {
                        value: "General Inquiry",
                        label: "General Inquiry",
                      },
                    ]}
                  />

                  <Textarea
                    label="Message"
                    required
                    rows={5}
                    placeholder="Describe your inquiry or question with relevant details..."
                    value={formData.message}
                    error={errors.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isSubmitting}
                    >
                      Send message
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* Right Column: Direct Desks & Office Information */}
          <div className="lg:col-span-5 space-y-6">
            <Card padding="lg" className="space-y-4">
              <div className="font-mono text-xs font-bold text-accent">
                // DIRECT DESKS
              </div>
              <div className="divide-y divide-editorial-line font-sans text-sm">
                <div className="py-3 space-y-1">
                  <div className="font-heading font-bold text-ink">
                    Student Admissions
                  </div>
                  <div className="font-mono text-xs text-editorial-muted">
                    {siteConfig.contact.admissionsEmail}
                  </div>
                </div>

                <div className="py-3 space-y-1">
                  <div className="font-heading font-bold text-ink">
                    Company Partnerships
                  </div>
                  <div className="font-mono text-xs text-editorial-muted">
                    {siteConfig.contact.partnershipsEmail}
                  </div>
                </div>

                <div className="py-3 space-y-1">
                  <div className="font-heading font-bold text-ink">General Inquiries</div>
                  <div className="font-mono text-xs text-editorial-muted">
                    {siteConfig.contact.generalEmail}
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="lg" className="space-y-4">
              <div className="font-mono text-xs font-bold text-accent">
                // OPERATIONAL HEADQUARTERS
              </div>
              <div className="space-y-3 font-sans text-sm">
                <div>
                  <div className="font-heading font-bold text-ink">
                    {siteConfig.contact.officeName}
                  </div>
                  <p className="text-editorial-muted text-xs leading-relaxed">
                    {siteConfig.contact.officeAddress}
                  </p>
                  <p className="text-editorial-muted text-xs leading-relaxed pt-1">
                    Phone: {siteConfig.contact.phone}
                  </p>
                </div>

                <div className="pt-2 border-t border-editorial-line">
                  <span className="font-mono text-xs text-editorial-muted">
                    Hours: {siteConfig.contact.hours}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Colophon Footer Matching Image 5 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
