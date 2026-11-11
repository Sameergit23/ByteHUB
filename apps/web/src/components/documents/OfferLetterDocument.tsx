import { ByteHubLogo } from "../brand/ByteHubLogo";
import { formatDate, formatWorkMode } from "../../lib/format";
import { siteConfig } from "../../lib/siteConfig";

export interface OfferLetterData {
  enrollmentId: string;
  studentName: string;
  studentEmail: string;
  programmeTitle: string;
  programmeSlug: string;
  cohortName: string;
  cohortCode: string;
  mode: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  /** When the seat was reserved/confirmed; printed as the letter date. */
  issuedAt: string;
}

/** Reference printed on the letter, stable for each enrolment: BH/OL/2026/1A2B3C4D. */
export function offerLetterReference(data: OfferLetterData): string {
  const year = new Date(data.issuedAt).getUTCFullYear() || new Date().getUTCFullYear();
  const shortId = data.enrollmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `BH/OL/${year}/${shortId}`;
}

/** The internship offer letter, sized like a portrait A4 page (also when printed). */
export function OfferLetterDocument({ data }: { data: OfferLetterData }) {
  const { contact, legal, documents, brandName } = siteConfig;
  const host = siteConfig.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const firstName = data.studentName.trim().split(/\s+/)[0] || data.studentName;
  const role = `${data.programmeTitle} Intern`;

  const details: [string, string][] = [
    ["Role", role],
    ["Programme", data.programmeTitle],
    ["Cohort", `${data.cohortName} (${data.cohortCode})`],
    ["Start date", formatDate(data.startDate)],
    ["End date", `${formatDate(data.endDate)} (${data.durationWeeks} weeks)`],
    ["Mode", formatWorkMode(data.mode)],
  ];

  return (
    <article
      aria-label={`Internship offer letter for ${data.studentName}`}
      className="mx-auto w-full max-w-3xl bg-white px-6 py-10 text-[13px] leading-relaxed text-ink shadow-[0_1px_0_#D8D3C4,0_24px_48px_-24px_rgba(22,21,15,0.25)] sm:px-14 sm:py-14 print:max-w-none print:px-16 print:py-14 print:shadow-none"
    >
      {/* Letterhead */}
      <header className="flex flex-col gap-4 border-b-2 border-ink pb-5 sm:flex-row sm:items-end sm:justify-between">
        <ByteHubLogo variant="light" size="md" withTagline />
        <div className="text-xs leading-5 text-editorial-muted sm:text-right">
          <p className="font-semibold text-ink">{contact.officeName}</p>
          <p>{contact.officeAddress}</p>
          <p>
            {contact.admissionsEmail} · {contact.phone}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap justify-between gap-2 font-mono text-[11px] text-editorial-muted">
        <span>Ref: {offerLetterReference(data)}</span>
        <span>Date: {formatDate(data.issuedAt)}</span>
      </div>

      <div className="mt-6">
        <p>To,</p>
        <p className="font-semibold">{data.studentName}</p>
        <p className="text-editorial-muted">{data.studentEmail}</p>
      </div>

      <p className="mt-6 font-semibold">Subject: Offer of internship as {role}</p>

      <div className="mt-5 space-y-4">
        <p>Dear {firstName},</p>
        <p>
          Congratulations! Following your enrolment in{" "}
          <strong>{data.programmeTitle}</strong>, we are pleased to offer you an
          internship with {brandName} on a live project, delivered as part of the
          programme.
        </p>

        <table className="w-full border border-editorial-border text-left">
          <tbody>
            {details.map(([label, value]) => (
              <tr key={label} className="border-b border-editorial-line last:border-b-0">
                <th
                  scope="row"
                  className="w-40 bg-editorial-surface px-3 py-2 font-mono text-[11px] font-normal uppercase tracking-wider text-editorial-muted"
                >
                  {label}
                </th>
                <td className="px-3 py-2 font-medium">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>
          During the internship you will build a real project with guidance from the{" "}
          {brandName} team. When you complete the programme and its project, you will
          receive a {brandName} certificate of completion that employers can verify
          online.
        </p>
        <p>
          This offer is linked to your enrolment in the cohort above and remains valid
          while that enrolment is active. It is subject to the {brandName} Terms of
          Service and Refund Policy, available at {host}/terms and {host}/refund-policy.
        </p>
        <p>We look forward to having you on board.</p>
      </div>

      <div className="mt-10">
        <p>Warm regards,</p>
        <p className="mt-6 font-heading text-lg font-bold italic">
          {documents.signatoryName}
        </p>
        <div className="mt-1 h-px w-40 bg-ink" />
        <p className="mt-1 text-xs text-editorial-muted">
          {documents.signatoryTitle}, {brandName}
        </p>
      </div>

      <footer className="mt-12 border-t border-editorial-border pt-4 text-[10px] leading-4 text-editorial-muted">
        <p>
          {brandName} · {legal.legalEntityName} · {legal.registeredAddress}
        </p>
        <p className="mt-1">
          This letter was issued electronically and is valid without a physical signature.
          Questions: {contact.admissionsEmail}
        </p>
      </footer>
    </article>
  );
}
