"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";
import type { AdminInternship, AdminTrack, Envelope } from "./types";
import {
  Button,
  Drawer,
  Field,
  FormError,
  inputClass,
  SegmentedChoice,
  splitLines,
  textareaClass,
} from "./ui";
import { runAdminAction, useAdminResource } from "./useAdminResource";

interface FormState {
  title: string;
  companyName: string;
  trackId: string;
  location: string;
  type: "REMOTE" | "HYBRID" | "ON_SITE";
  stipendMode: "PAID" | "UNPAID";
  stipend: string;
  feeMode: "FREE" | "FEE";
  registrationFee: string;
  durationMonths: string;
  openings: string;
  deadline: string;
  description: string;
  whatYouWillDo: string;
  requirements: string;
  skills: string;
}

const EMPTY: FormState = {
  title: "",
  companyName: "",
  trackId: "",
  location: "",
  type: "REMOTE",
  stipendMode: "PAID",
  stipend: "",
  feeMode: "FREE",
  registrationFee: "",
  durationMonths: "3",
  openings: "1",
  deadline: "",
  description: "",
  whatYouWillDo: "",
  requirements: "",
  skills: "",
};

function fromInternship(i: AdminInternship): FormState {
  return {
    title: i.title,
    companyName: i.companyName,
    trackId: i.trackId || "",
    location: i.location,
    type: (["REMOTE", "HYBRID", "ON_SITE"].includes(i.type)
      ? i.type
      : "REMOTE") as FormState["type"],
    stipendMode: i.stipendAmount > 0 ? "PAID" : "UNPAID",
    stipend: i.stipendAmount > 0 ? String(Math.round(i.stipendAmount / 100)) : "",
    feeMode: (i.registrationFeeAmount ?? 0) > 0 ? "FEE" : "FREE",
    registrationFee:
      (i.registrationFeeAmount ?? 0) > 0
        ? String(Math.round(i.registrationFeeAmount / 100))
        : "",
    durationMonths: String(i.durationMonths),
    openings: String(i.openings),
    deadline: i.deadline.slice(0, 10),
    description: i.description,
    whatYouWillDo: i.whatYouWillDo.join("\n"),
    requirements: i.requirements.join("\n"),
    skills: i.skills.join(", "),
  };
}

/**
 * Post a new internship (it goes live straight away) or edit an existing one.
 * Internships are published by ByteHUB itself; companies send roles via the contact form.
 */
export function InternshipFormDrawer({
  internship,
  onClose,
  onSaved,
}: {
  /** The internship to edit, or null to post a new one. */
  internship: AdminInternship | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = internship !== null;
  const [form, setForm] = useState<FormState>(
    internship ? fromInternship(internship) : EMPTY
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tracks = useAdminResource<AdminTrack[], Envelope<AdminTrack[]>>(
    "/admin/tracks",
    (res) => res.data
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paidStipend = form.stipendMode === "PAID";
    const chargesFee = form.feeMode === "FEE";
    const stipend = paidStipend ? Number(form.stipend) : 0;
    const registrationFee = chargesFee ? Number(form.registrationFee) : 0;
    const durationMonths = Number(form.durationMonths);
    const openings = Number(form.openings);
    const requirements = splitLines(form.requirements);
    const skills = form.skills
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const deadline = form.deadline ? new Date(`${form.deadline}T23:59:59.000Z`) : null;

    const problem =
      form.title.trim().length < 3
        ? "Give the internship a title (at least 3 characters)."
        : form.companyName.trim().length < 2
          ? "Enter the company offering the internship."
          : form.location.trim().length < 2
            ? "Enter a location (e.g. Remote or Indore, India)."
            : paidStipend &&
                (!form.stipend.trim() || !Number.isInteger(stipend) || stipend < 1)
              ? "Enter the monthly stipend in whole rupees, or choose Unpaid."
              : chargesFee &&
                  (!form.registrationFee.trim() ||
                    !Number.isInteger(registrationFee) ||
                    registrationFee < 1 ||
                    registrationFee > 50000)
                ? "Enter a registration fee between ₹1 and ₹50,000, or choose Free to apply."
                : !Number.isInteger(durationMonths) ||
                    durationMonths < 1 ||
                    durationMonths > 24
                  ? "Duration must be between 1 and 24 months."
                  : !Number.isInteger(openings) || openings < 1
                    ? "Openings must be at least 1."
                    : !deadline || Number.isNaN(deadline.getTime())
                      ? "Choose an application deadline."
                      : !editing && deadline.getTime() < Date.now()
                        ? "The application deadline must be in the future."
                        : form.description.trim().length < 50
                          ? "Describe the internship in at least 50 characters."
                          : requirements.length === 0
                            ? "Add at least one requirement (one per line)."
                            : skills.length === 0
                              ? "Add at least one skill."
                              : null;
    if (problem || !deadline) {
      setError(problem || "Choose an application deadline.");
      return;
    }

    setError(null);
    setSaving(true);
    const body = {
      title: form.title.trim(),
      companyName: form.companyName.trim(),
      location: form.location.trim(),
      type: form.type,
      stipend,
      registrationFee,
      currency: "INR",
      durationMonths,
      openings,
      deadline: deadline.toISOString(),
      description: form.description.trim(),
      whatYouWillDo: splitLines(form.whatYouWillDo),
      requirements,
      skills,
      ...(form.trackId ? { trackId: form.trackId } : {}),
    };
    const result = await runAdminAction(() =>
      editing
        ? apiFetch(`/internships/${internship.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : apiFetch("/internships", { method: "POST", body: JSON.stringify(body) })
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(
      editing
        ? `"${body.title}" was updated.`
        : `"${body.title}" is now live on the Internships page.`
    );
  };

  return (
    <Drawer
      open
      onClose={saving ? () => undefined : onClose}
      title={editing ? "Edit internship" : "Post an internship"}
      subtitle={
        editing
          ? "Changes show on the public page straight away."
          : "It goes live on the Internships page as soon as you post it."
      }
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="internship-form"
            variant="primary"
            disabled={saving}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Post internship"}
          </Button>
        </>
      }
    >
      <form id="internship-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field label="Title" htmlFor="int-title">
          <input
            id="int-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Backend Developer Intern"
            className={inputClass}
            data-autofocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="int-company" hint="Shown on the listing.">
            <input
              id="int-company"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="e.g. Nimbus Labs"
              className={inputClass}
            />
          </Field>
          <Field label="Track (optional)" htmlFor="int-track">
            <select
              id="int-track"
              value={form.trackId}
              onChange={(e) => set("trackId", e.target.value)}
              className={inputClass}
            >
              <option value="">No track</option>
              {(tracks.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location" htmlFor="int-location">
            <input
              id="int-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Indore, India"
              className={inputClass}
            />
          </Field>
          <Field label="Work mode" htmlFor="int-type">
            <select
              id="int-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as FormState["type"])}
              className={inputClass}
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
            </select>
          </Field>
          <Field label="Duration (months)" htmlFor="int-duration">
            <input
              id="int-duration"
              type="number"
              min={1}
              max={24}
              inputMode="numeric"
              value={form.durationMonths}
              onChange={(e) => set("durationMonths", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Openings" htmlFor="int-openings">
            <input
              id="int-openings"
              type="number"
              min={1}
              inputMode="numeric"
              value={form.openings}
              onChange={(e) => set("openings", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Apply by" htmlFor="int-deadline">
            <input
              id="int-deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <fieldset className="border border-zinc-200 bg-zinc-50 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            Stipend and fees
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-800">Stipend</span>
                <SegmentedChoice
                  name="stipend-mode"
                  label="Stipend"
                  value={form.stipendMode}
                  onChange={(v) => set("stipendMode", v)}
                  options={[
                    { value: "PAID", label: "Paid" },
                    { value: "UNPAID", label: "Unpaid" },
                  ]}
                />
              </div>
              {form.stipendMode === "PAID" ? (
                <Field
                  label="Stipend per month (₹)"
                  htmlFor="int-stipend"
                  hint="What the intern is paid each month."
                >
                  <input
                    id="int-stipend"
                    type="number"
                    min={1}
                    step={500}
                    inputMode="numeric"
                    value={form.stipend}
                    onChange={(e) => set("stipend", e.target.value)}
                    placeholder="e.g. 8000"
                    className={inputClass}
                  />
                </Field>
              ) : (
                <p className="text-xs text-zinc-500">
                  The listing will say &ldquo;Unpaid&rdquo;.
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  Registration fee
                </span>
                <SegmentedChoice
                  name="fee-mode"
                  label="Registration fee"
                  value={form.feeMode}
                  onChange={(v) => set("feeMode", v)}
                  options={[
                    { value: "FREE", label: "Free to apply" },
                    { value: "FEE", label: "Charge a fee" },
                  ]}
                />
              </div>
              {form.feeMode === "FEE" ? (
                <Field
                  label="Registration fee (₹)"
                  htmlFor="int-fee"
                  hint={
                    editing
                      ? "Paid online when applying. Changing it only affects students who haven't paid yet."
                      : "Paid online when applying. Refunded in full if the student isn't selected."
                  }
                >
                  <input
                    id="int-fee"
                    type="number"
                    min={1}
                    max={50000}
                    step={50}
                    inputMode="numeric"
                    value={form.registrationFee}
                    onChange={(e) => set("registrationFee", e.target.value)}
                    placeholder="e.g. 499"
                    className={inputClass}
                  />
                </Field>
              ) : (
                <p className="text-xs text-zinc-500">
                  Students apply without paying anything.
                </p>
              )}
            </div>
          </div>
        </fieldset>
        <Field
          label="Description"
          htmlFor="int-description"
          hint="At least 50 characters."
        >
          <textarea
            id="int-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What the team does, what the intern will learn, and how they will be mentored."
            className={textareaClass}
            rows={5}
          />
        </Field>
        <Field
          label="What the intern will do (optional)"
          htmlFor="int-tasks"
          hint="One per line."
        >
          <textarea
            id="int-tasks"
            value={form.whatYouWillDo}
            onChange={(e) => set("whatYouWillDo", e.target.value)}
            className={textareaClass}
            rows={3}
          />
        </Field>
        <Field label="Requirements" htmlFor="int-requirements" hint="One per line.">
          <textarea
            id="int-requirements"
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            placeholder={"Comfortable with JavaScript\nBasic SQL"}
            className={textareaClass}
            rows={3}
          />
        </Field>
        <Field label="Skills" htmlFor="int-skills" hint="Separate with commas.">
          <input
            id="int-skills"
            value={form.skills}
            onChange={(e) => set("skills", e.target.value)}
            placeholder="Node.js, PostgreSQL, Git"
            className={inputClass}
          />
        </Field>
      </form>
    </Drawer>
  );
}
