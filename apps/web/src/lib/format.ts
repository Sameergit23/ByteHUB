/** Display formatting shared by server and client components. */

export function formatMoney(amountMinor: number, currency = "INR"): string {
  const major = amountMinor / 100;
  if (currency.toUpperCase() === "INR") {
    return `₹${major.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  if (currency.toUpperCase() === "USD") {
    return `$${major.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `${currency.toUpperCase()} ${major.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatStipend(amountMinor: number, currency = "INR"): string {
  return amountMinor > 0 ? `${formatMoney(amountMinor, currency)} / mo` : "Unpaid";
}

/** "15 Dec 2026" — fixed locale and UTC so server and browser render the same text. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WORK_MODE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ON_SITE: "On-site",
};

export function formatWorkMode(type: string): string {
  return WORK_MODE_LABELS[type] || type;
}

export function formatDuration(months: number): string {
  return `${months} ${months === 1 ? "month" : "months"}`;
}

/** Application pipeline stages as stored by the API, with their display labels. */
export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER REVIEW",
  INTERVIEW: "INTERVIEW",
  OFFERED: "OFFERED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
};
