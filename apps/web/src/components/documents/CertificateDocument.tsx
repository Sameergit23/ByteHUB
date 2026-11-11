import { ByteHubLogo, ByteHubSymbol } from "../brand/ByteHubLogo";
import { formatDate, formatWorkMode } from "../../lib/format";
import { siteConfig } from "../../lib/siteConfig";

export interface VerifiedCertificate {
  certificateCode: string;
  holderName: string;
  title: string;
  programmeTitle: string;
  programmeSlug: string;
  cohortName: string;
  cohortCode: string;
  durationWeeks: number;
  mode: string;
  startDate: string;
  endDate: string;
  issuedAt: string;
  revokedAt: string | null;
  valid: boolean;
}

/** The certificate itself, sized like a landscape A4 page (also when printed). */
export function CertificateDocument({
  certificate,
}: {
  certificate: VerifiedCertificate;
}) {
  const host = siteConfig.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <article
      aria-label={`Certificate of completion for ${certificate.holderName}`}
      className="certificate-sheet relative mx-auto w-full max-w-4xl bg-white text-ink shadow-[0_1px_0_#D8D3C4,0_24px_48px_-24px_rgba(22,21,15,0.25)] sm:aspect-[1.414/1] print:max-w-none print:shadow-none"
    >
      {/* Double frame */}
      <div className="absolute inset-2 border border-ink sm:inset-3" aria-hidden="true" />
      <div
        className="absolute inset-3.5 border border-editorial-border sm:inset-5"
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col items-center justify-between gap-6 px-6 py-10 text-center sm:px-14 sm:py-12">
        <div className="flex flex-col items-center gap-3">
          <ByteHubLogo variant="light" size="md" withTagline />
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-accent">
            Certificate of Completion
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-editorial-muted">This is to certify that</p>
          <p className="font-heading text-3xl font-bold tracking-tight sm:text-5xl">
            {certificate.holderName}
          </p>
          <p className="text-sm text-editorial-muted">has successfully completed</p>
          <p className="font-heading text-xl font-bold sm:text-3xl">
            {certificate.programmeTitle}
          </p>
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-editorial-muted sm:text-sm">
            a {certificate.durationWeeks}-week{" "}
            {formatWorkMode(certificate.mode).toLowerCase()} training programme with a
            live project · {certificate.cohortName}{" "}
            <span className="whitespace-nowrap">({certificate.cohortCode})</span> ·{" "}
            {formatDate(certificate.startDate)} – {formatDate(certificate.endDate)}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 items-end gap-4 text-left">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted">
              Date of issue
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatDate(certificate.issuedAt)}
            </p>
          </div>
          <div className="flex justify-center" aria-hidden="true">
            <div className="flex h-16 w-16 items-center justify-center border border-ink sm:h-20 sm:w-20">
              <ByteHubSymbol size={44} />
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading text-base font-bold italic">
              {siteConfig.documents.signatoryName}
            </p>
            <div className="ml-auto mt-1 h-px w-32 bg-ink" />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-editorial-muted">
              {siteConfig.documents.signatoryTitle}, {siteConfig.brandName}
            </p>
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-wider text-editorial-muted">
          Certificate ID {certificate.certificateCode} · Verify at {host}/verify/
          {certificate.certificateCode}
        </p>
      </div>
    </article>
  );
}
