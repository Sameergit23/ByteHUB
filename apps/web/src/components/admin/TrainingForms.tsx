"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { IconClose, IconPlus } from "./icons";
import type {
  AdminCohort,
  AdminProgramme,
  AdminTrack,
  Envelope,
  SyllabusWeek,
} from "./types";
import {
  Button,
  CheckboxField,
  Drawer,
  Field,
  FormError,
  inputClass,
  splitLines,
  textareaClass,
} from "./ui";
import { runAdminAction, useAdminResource } from "./useAdminResource";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

/* ------------------------------------------------------------------------------------------ */
/* Programme                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function ProgrammeFormDrawer({
  programme,
  onClose,
  onSaved,
}: {
  /** The programme to edit, or null to create one. */
  programme: AdminProgramme | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = programme !== null;
  const tracks = useAdminResource<AdminTrack[], Envelope<AdminTrack[]>>(
    "/admin/tracks",
    (res) => res.data
  );

  const [trackId, setTrackId] = useState(programme?.trackId ?? "");
  const [title, setTitle] = useState(programme?.title ?? "");
  const [slug, setSlug] = useState(programme?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [summary, setSummary] = useState(programme?.summary ?? "");
  const [description, setDescription] = useState(programme?.description ?? "");
  const [prerequisites, setPrerequisites] = useState(
    (programme?.prerequisites ?? []).join("\n")
  );
  const [weeks, setWeeks] = useState<SyllabusWeek[]>(
    programme?.syllabus?.length
      ? programme.syllabus.map((w, i) => ({
          week: i + 1,
          title: w.title ?? "",
          description: w.description ?? "",
        }))
      : [{ week: 1, title: "", description: "" }]
  );
  const [published, setPublished] = useState(programme?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const updateWeek = (index: number, key: "title" | "description", value: string) =>
    setWeeks((list) => list.map((w, i) => (i === index ? { ...w, [key]: value } : w)));
  const addWeek = () =>
    setWeeks((list) => [...list, { week: list.length + 1, title: "", description: "" }]);
  const removeWeek = (index: number) =>
    setWeeks((list) =>
      list.filter((_, i) => i !== index).map((w, i) => ({ ...w, week: i + 1 }))
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const syllabus = weeks
      .map((w) => ({ ...w, title: w.title.trim(), description: w.description.trim() }))
      .filter((w) => w.title || w.description)
      .map((w, i) => ({ ...w, week: i + 1 }));
    const problem = !trackId
      ? "Choose a track."
      : title.trim().length < 3
        ? "Give the programme a title (at least 3 characters)."
        : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
          ? "The web address can use lowercase letters, numbers and dashes only."
          : summary.trim().length < 10
            ? "Write a one-line summary (at least 10 characters)."
            : description.trim().length < 30
              ? "Describe the programme in at least 30 characters."
              : syllabus.some((w) => w.title.length < 2)
                ? "Give every syllabus week a title."
                : null;
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const body = {
      trackId,
      title: title.trim(),
      slug,
      summary: summary.trim(),
      description: description.trim(),
      prerequisites: splitLines(prerequisites),
      syllabus,
      published,
    };
    const result = await runAdminAction(() =>
      editing
        ? apiFetch(`/admin/programmes/${programme.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : apiFetch("/admin/programmes", { method: "POST", body: JSON.stringify(body) })
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(
      editing
        ? `"${body.title}" was updated.`
        : `"${body.title}" was created. Add a cohort so students can enrol.`
    );
  };

  return (
    <Drawer
      open
      onClose={saving ? () => undefined : onClose}
      title={editing ? "Edit programme" : "New programme"}
      subtitle="Programmes appear on the Training page. Students enrol in a programme's cohorts."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="programme-form" variant="primary" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create programme"}
          </Button>
        </>
      }
    >
      <form id="programme-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Track" htmlFor="prog-track">
            <select
              id="prog-track"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              className={inputClass}
              data-autofocus
            >
              <option value="">Choose a track</option>
              {(tracks.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" htmlFor="prog-title">
            <input
              id="prog-title"
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="e.g. Full-Stack Web Development"
              className={inputClass}
            />
          </Field>
        </div>
        <Field
          label="Web address"
          htmlFor="prog-slug"
          hint={`bytehubnet.com/training/${slug || "…"}`}
        >
          <input
            id="prog-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </Field>
        <Field
          label="Summary"
          htmlFor="prog-summary"
          hint="One line, shown on programme cards."
        >
          <input
            id="prog-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={240}
            placeholder="e.g. HTML to full-stack, built on real projects."
            className={inputClass}
          />
        </Field>
        <Field label="Description" htmlFor="prog-description">
          <textarea
            id="prog-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaClass}
            rows={4}
          />
        </Field>
        <Field
          label="Prerequisites (optional)"
          htmlFor="prog-prereq"
          hint="One per line."
        >
          <textarea
            id="prog-prereq"
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            className={textareaClass}
            rows={2}
          />
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-zinc-800">Weekly syllabus</legend>
          {weeks.map((w, index) => (
            <div key={index} className="border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Week {index + 1}
                </span>
                {weeks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWeek(index)}
                    className="p-1 text-zinc-400 hover:text-red-700"
                    aria-label={`Remove week ${index + 1}`}
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                value={w.title}
                onChange={(e) => updateWeek(index, "title", e.target.value)}
                placeholder="Week title"
                aria-label={`Week ${index + 1} title`}
                className={inputClass}
              />
              <input
                value={w.description}
                onChange={(e) => updateWeek(index, "description", e.target.value)}
                placeholder="What students learn and build"
                aria-label={`Week ${index + 1} description`}
                className={`${inputClass} mt-2`}
              />
            </div>
          ))}
          <Button size="sm" onClick={addWeek}>
            <IconPlus className="h-3.5 w-3.5" />
            Add week
          </Button>
        </fieldset>

        <CheckboxField
          id="prog-published"
          label="Show on the website"
          hint="Untick to hide the programme while you prepare it."
          checked={published}
          onChange={setPublished}
        />
      </form>
    </Drawer>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Cohort                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** "Full-Stack Web Development" + 2027-01-12 → "BH-FSWD-2701" (editable suggestion). */
function suggestCode(title: string, startDate: string): string {
  const initials = title
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase())
    .join("")
    .slice(0, 5);
  const ym = startDate ? startDate.slice(2, 4) + startDate.slice(5, 7) : "";
  return ["BH", initials || "COH", ym].filter(Boolean).join("-");
}

export function CohortFormDrawer({
  cohort,
  programmes,
  onClose,
  onSaved,
}: {
  /** The cohort to edit, or null to create one. */
  cohort: AdminCohort | null;
  programmes: AdminProgramme[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = cohort !== null;
  const [programmeId, setProgrammeId] = useState(
    cohort ? "" : programmes.length === 1 ? programmes[0]!.id : ""
  );
  const [name, setName] = useState(cohort?.name ?? "");
  const [code, setCode] = useState(cohort?.cohortCode ?? "");
  const [codeTouched, setCodeTouched] = useState(editing);
  const [mode, setMode] = useState(cohort?.mode ?? "REMOTE");
  const [startDate, setStartDate] = useState(cohort ? cohort.startDate.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(cohort ? cohort.endDate.slice(0, 10) : "");
  const [price, setPrice] = useState(cohort ? String(cohort.priceAmount / 100) : "");
  const [seats, setSeats] = useState(cohort ? String(cohort.seatsTotal) : "30");
  const [published, setPublished] = useState(cohort?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const programmeTitle = (id: string) => programmes.find((p) => p.id === id)?.title ?? "";
  const refreshCode = (nextProgrammeId: string, nextStart: string) => {
    if (!codeTouched) setCode(suggestCode(programmeTitle(nextProgrammeId), nextStart));
  };

  const weeks =
    startDate && endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          )
        )
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceRupees = Number(price);
    const seatsTotal = Number(seats);
    const problem =
      !editing && !programmeId
        ? "Choose a programme."
        : name.trim().length < 3
          ? "Give the cohort a name, e.g. January 2027 cohort."
          : !editing && !/^[A-Z0-9-]{3,40}$/.test(code)
            ? "The code can use capital letters, numbers and dashes (3 to 40)."
            : !startDate || !endDate
              ? "Choose a start and an end date."
              : new Date(endDate) <= new Date(startDate)
                ? "The end date must be after the start date."
                : price === "" || !Number.isFinite(priceRupees) || priceRupees < 0
                  ? "Enter the price in rupees (0 for a free cohort)."
                  : !editing && (!Number.isInteger(seatsTotal) || seatsTotal < 1)
                    ? "Enter how many seats the cohort has."
                    : null;
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const common = {
      name: name.trim(),
      mode,
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T00:00:00.000Z`,
      priceAmount: Math.round(priceRupees * 100),
      published,
    };
    const result = await runAdminAction(() =>
      editing
        ? apiFetch(`/admin/cohorts/${cohort.id}`, {
            method: "PATCH",
            body: JSON.stringify(common),
          })
        : apiFetch("/admin/cohorts", {
            method: "POST",
            body: JSON.stringify({
              ...common,
              programmeId,
              cohortCode: code,
              seatsTotal,
            }),
          })
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(
      editing ? `${cohort.cohortCode} was updated.` : `Cohort ${code} was created.`
    );
  };

  return (
    <Drawer
      open
      onClose={saving ? () => undefined : onClose}
      title={editing ? `Edit ${cohort.cohortCode}` : "New cohort"}
      subtitle={
        editing
          ? "Seats are changed from Manage. The code and programme stay fixed."
          : "A cohort is one scheduled run of a programme that students pay for and join."
      }
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="cohort-form" variant="primary" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create cohort"}
          </Button>
        </>
      }
    >
      <form id="cohort-form" onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        {!editing && (
          <Field label="Programme" htmlFor="coh-programme">
            <select
              id="coh-programme"
              value={programmeId}
              onChange={(e) => {
                setProgrammeId(e.target.value);
                refreshCode(e.target.value, startDate);
              }}
              className={inputClass}
              data-autofocus
            >
              <option value="">Choose a programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="coh-name">
            <input
              id="coh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. January 2027 cohort"
              className={inputClass}
            />
          </Field>
          <Field
            label="Code"
            htmlFor="coh-code"
            hint={
              editing
                ? "Fixed after creation."
                : "Suggested from the programme and start month."
            }
          >
            <input
              id="coh-code"
              value={code}
              disabled={editing}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
              }}
              className={`${inputClass} font-mono disabled:bg-zinc-100 disabled:text-zinc-500`}
            />
          </Field>
          <Field label="Starts" htmlFor="coh-start">
            <input
              id="coh-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                refreshCode(programmeId, e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label="Ends"
            htmlFor="coh-end"
            hint={weeks ? `${weeks} weeks` : undefined}
          >
            <input
              id="coh-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Mode" htmlFor="coh-mode">
            <select
              id="coh-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className={inputClass}
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
            </select>
          </Field>
          <Field
            label="Price (₹)"
            htmlFor="coh-price"
            hint="Students pay this at checkout."
          >
            <input
              id="coh-price"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 24000"
              className={inputClass}
            />
          </Field>
          {!editing && (
            <Field label="Seats" htmlFor="coh-seats">
              <input
                id="coh-seats"
                type="number"
                min={1}
                inputMode="numeric"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>
        <CheckboxField
          id="coh-published"
          label="Open for enrolment"
          hint="Untick to hide the cohort from students."
          checked={published}
          onChange={setPublished}
        />
      </form>
    </Drawer>
  );
}
