import type { Metadata } from "next";
import Link from "next/link";
import { apiFetch, ApiError, type ApiEnvelope } from "../../../../lib/api";
import { formatDate } from "../../../../lib/format";
import {
  CertificateDocument,
  type VerifiedCertificate,
} from "../../../../components/documents/CertificateDocument";
import {
  CopyLinkButton,
  PrintButton,
} from "../../../../components/documents/PrintButton";

// Certificates can be revoked, so every visit checks the live record.
export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

async function loadCertificate(code: string): Promise<VerifiedCertificate | null> {
  try {
    const res = await apiFetch<ApiEnvelope<VerifiedCertificate>>(
      `/certificates/${encodeURIComponent(code)}`
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Certificate ${decodeURIComponent(code).toUpperCase()} · ByteHUB`,
    description: "Check that a ByteHUB certificate of completion is genuine.",
    // Certificates carry people's names: keep them out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function VerifyCertificatePage({ params }: { params: Params }) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim().toUpperCase();
  const certificate = await loadCertificate(code);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Landscape A4 when printed; only the certificate goes to paper. */}
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } }`}</style>

      {!certificate ? (
        <div className="mx-auto max-w-xl animate-reveal space-y-5 border border-editorial-border bg-editorial-surface p-8 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
            Not found
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            No certificate with this ID
          </h1>
          <p className="text-sm text-editorial-muted">
            We couldn&apos;t find a ByteHUB certificate with the ID{" "}
            <span className="font-mono font-semibold text-ink">{code}</span>. Check it was
            typed exactly as printed, including the dashes.
          </p>
          <Link
            href="/verify"
            className="inline-block border border-ink px-4 py-2.5 text-xs font-medium uppercase tracking-wider hover:bg-ink hover:text-canvas"
          >
            Check another ID
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            role="status"
            className={`animate-alert-in flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:justify-between print:hidden ${
              certificate.valid
                ? "border-green-700/30 bg-green-50 text-green-900"
                : "border-accent/40 bg-accent-light text-accent"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-white ${
                  certificate.valid ? "bg-green-700" : "bg-accent"
                }`}
              >
                {certificate.valid ? "✓" : "!"}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {certificate.valid
                    ? "Verified: this certificate is genuine"
                    : "This certificate has been revoked"}
                </p>
                <p className="mt-0.5 text-xs">
                  {certificate.valid
                    ? `Issued by ByteHUB to ${certificate.holderName} on ${formatDate(certificate.issuedAt)}.`
                    : `It was withdrawn on ${formatDate(certificate.revokedAt)} and is no longer valid.`}
                </p>
              </div>
            </div>
            {certificate.valid && (
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton />
                <PrintButton />
              </div>
            )}
          </div>

          <div
            className={
              certificate.valid ? "animate-reveal [animation-delay:120ms]" : "opacity-50"
            }
          >
            <CertificateDocument certificate={certificate} />
          </div>

          <p className="text-center text-xs text-editorial-muted print:hidden">
            Programme details:{" "}
            <Link
              href={`/training/${certificate.programmeSlug}`}
              className="underline hover:text-ink"
            >
              {certificate.programmeTitle}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
