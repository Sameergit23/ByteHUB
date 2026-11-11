import { SERVER_API_BASE } from "./api";
import {
  formatDate,
  formatDuration,
  formatMoney,
  formatRegistrationFee,
  formatStipend,
  formatWorkMode,
} from "./format";

/**
 * Public catalogue (internships and training programmes), read from the ByteHUB API.
 *
 * Used by server components. Responses are cached for a minute so page views do not
 * translate one-to-one into API calls.
 */

const REVALIDATE_SECONDS = 60;

// ---------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------

export interface InternshipItem {
  id: string;
  slug: string;
  title: string;
  companyName: string;
  location: string;
  /** Display label: "Remote", "Hybrid", "On-site" */
  type: string;
  /** Raw API value: REMOTE | HYBRID | ON_SITE */
  typeCode: string;
  track: string;
  stipend: string;
  /** Paid online when applying, in paise. 0 = free to apply. */
  registrationFeeAmount: number;
  /** Display label: "₹499" or "Free to apply" */
  registrationFee: string;
  duration: string;
  durationMonths: number;
  deadline: string;
  deadlineIso: string;
  postedIso: string;
  isOpen: boolean;
  aboutRole: string;
  whatYouWillDo: string[];
  requirements: string[];
  skills: string[];
}

export interface SyllabusWeek {
  week: number;
  title: string;
  description: string;
}

export interface TrainingProgramItem {
  id: string;
  slug: string;
  title: string;
  trackName: string;
  trackSlug: string;
  mode: string;
  weeks: string;
  fee: string;
  startDate: string;
  seatsLeft: string;
  description: string;
  syllabus: SyllabusWeek[];
  prerequisites: string[];
  /** The cohort a visitor would enrol in, when one is open. */
  cohort: {
    id: string;
    cohortCode: string;
    priceAmount: number;
    currency: string;
    startDateIso: string;
    seatsLeft: number;
    isOpen: boolean;
  } | null;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

type FetchResult<T> = { ok: true; data: T } | { ok: false; notFound: boolean };

async function apiGet<T>(path: string): Promise<FetchResult<T>> {
  try {
    const res = await fetch(`${SERVER_API_BASE}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });

    if (res.status === 404) return { ok: false, notFound: true };
    if (!res.ok) return { ok: false, notFound: false };

    const body = await res.json();
    return { ok: true, data: body.data as T };
  } catch {
    return { ok: false, notFound: false };
  }
}

/** Thrown when the API cannot be reached, so pages can show an outage notice instead of a 404. */
export class CatalogUnavailableError extends Error {
  constructor() {
    super("The ByteHUB catalogue is temporarily unavailable.");
    this.name = "CatalogUnavailableError";
  }
}

// ---------------------------------------------------------------------------
// Internships
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads are mapped field by field below */

function toInternshipItem(raw: any): InternshipItem {
  const deadline = new Date(raw.deadline);
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    companyName: raw.companyName,
    location: raw.location,
    type: formatWorkMode(raw.type),
    typeCode: raw.type,
    track: raw.track?.name || "General",
    stipend: formatStipend(raw.stipendAmount ?? 0, raw.currency),
    registrationFeeAmount: raw.registrationFeeAmount ?? 0,
    registrationFee: formatRegistrationFee(raw.registrationFeeAmount ?? 0),
    duration: formatDuration(raw.durationMonths ?? 0),
    durationMonths: raw.durationMonths ?? 0,
    deadline: formatDate(raw.deadline),
    deadlineIso: deadline.toISOString(),
    postedIso: new Date(raw.createdAt).toISOString(),
    isOpen: raw.status === "PUBLISHED" && deadline.getTime() > Date.now(),
    aboutRole: raw.description,
    whatYouWillDo: raw.whatYouWillDo || [],
    requirements: raw.requirements || [],
    skills: raw.skills || [],
  };
}

/** All published internships (the API caps a page at 50). Returns null when the API is down. */
export async function getInternships(): Promise<InternshipItem[] | null> {
  const result = await apiGet<{ items: any[] }>("/internships?limit=50");
  if (!result.ok) return null;
  return result.data.items.map(toInternshipItem);
}

/** One internship by slug or id. Returns null when it does not exist. */
export async function getInternship(slugOrId: string): Promise<InternshipItem | null> {
  const result = await apiGet<any>(`/internships/${encodeURIComponent(slugOrId)}`);
  if (result.ok) return toInternshipItem(result.data);
  if (result.notFound) return null;
  throw new CatalogUnavailableError();
}

// ---------------------------------------------------------------------------
// Training programmes
// ---------------------------------------------------------------------------

function pickCohort(cohorts: any[] | undefined): any | null {
  if (!cohorts || cohorts.length === 0) return null;
  const now = Date.now();
  // Cohorts arrive sorted by start date: prefer the next one that has not started yet.
  return (
    cohorts.find((c) => new Date(c.startDate).getTime() > now) ||
    cohorts[cohorts.length - 1]
  );
}

function toSyllabus(raw: unknown): SyllabusWeek[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w) => w && typeof w === "object")
    .map((w: any, index) => ({
      week: Number(w.week) || index + 1,
      title: String(w.title || `Week ${index + 1}`),
      description: String(w.description || ""),
    }));
}

function toProgramItem(raw: any): TrainingProgramItem {
  const cohort = pickCohort(raw.cohorts);
  const seats = cohort?.seatsLeft ?? 0;
  const startsInFuture = cohort
    ? new Date(cohort.startDate).getTime() > Date.now()
    : false;

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    trackName: raw.track?.name || "General",
    trackSlug: raw.track?.slug || "general",
    mode: cohort?.mode || "Schedule to be announced",
    weeks: cohort ? String(cohort.durationWeeks) : "—",
    fee: cohort
      ? cohort.priceAmount > 0
        ? formatMoney(cohort.priceAmount, cohort.currency)
        : "Free"
      : "—",
    startDate: cohort ? formatDate(cohort.startDate) : "To be announced",
    seatsLeft: !cohort
      ? "No open cohort"
      : seats > 0
        ? `${seats} seats left`
        : "Sold out",
    description: raw.description || raw.summary || "",
    syllabus: toSyllabus(raw.syllabus),
    prerequisites: raw.prerequisites || [],
    cohort: cohort
      ? {
          id: cohort.id,
          cohortCode: cohort.cohortCode,
          priceAmount: cohort.priceAmount,
          currency: cohort.currency,
          startDateIso: new Date(cohort.startDate).toISOString(),
          seatsLeft: seats,
          isOpen: seats > 0 && startsInFuture,
        }
      : null,
  };
}

/** All published programmes. Returns null when the API is down. */
export async function getProgrammes(): Promise<TrainingProgramItem[] | null> {
  const result = await apiGet<any[]>("/training");
  if (!result.ok) return null;
  return result.data.map(toProgramItem);
}

/** One programme by slug or id. Returns null when it does not exist. */
export async function getProgramme(
  slugOrId: string
): Promise<TrainingProgramItem | null> {
  const result = await apiGet<any>(`/training/${encodeURIComponent(slugOrId)}`);
  if (result.ok) return toProgramItem(result.data);
  if (result.notFound) return null;
  throw new CatalogUnavailableError();
}
