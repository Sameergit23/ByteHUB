"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  ApiError,
  redirectToLogin,
  type ApiEnvelope,
} from "../../../../../lib/api";
import {
  OfferLetterDocument,
  type OfferLetterData,
} from "../../../../../components/documents/OfferLetterDocument";
import { PrintButton } from "../../../../../components/documents/PrintButton";
import {
  FormAlert,
  describeError,
  type AlertInfo,
} from "../../../../../components/ui/FormAlert";
import { PageLoader } from "../../../../../components/ui/Loader";

interface MyEnrollment {
  id: string;
  status: string;
  enrolledAt: string;
  cohort: {
    cohortCode: string;
    name: string;
    mode: string;
    startDate: string;
    endDate: string;
    durationWeeks: number;
  };
  programme: { slug: string; title: string };
}

interface Me {
  name: string;
  email: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; letter: OfferLetterData }
  | { kind: "unavailable"; title: string; message: string }
  | { kind: "error"; alert: AlertInfo };

export default function OfferLetterPage() {
  const params = useParams<{ id: string }>();
  const enrollmentId = params?.id ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [me, enrollments] = await Promise.all([
        apiFetch<ApiEnvelope<Me>>("/auth/me"),
        apiFetch<ApiEnvelope<MyEnrollment[]>>("/training/my/enrollments"),
      ]);
      const enrollment = enrollments.data.find((e) => e.id === enrollmentId);

      if (!enrollment) {
        setState({
          kind: "unavailable",
          title: "Offer letter not found",
          message:
            "This letter doesn't belong to your account, or the link is incomplete.",
        });
        return;
      }
      if (enrollment.status === "PENDING") {
        setState({
          kind: "unavailable",
          title: "Almost there",
          message:
            "Your offer letter is issued as soon as your seat is confirmed. Complete your payment to receive it.",
        });
        return;
      }
      if (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED") {
        setState({
          kind: "unavailable",
          title: "This enrolment is no longer active",
          message: "Offer letters are only available for confirmed enrolments.",
        });
        return;
      }

      setState({
        kind: "ready",
        letter: {
          enrollmentId: enrollment.id,
          studentName: me.data.name,
          studentEmail: me.data.email,
          programmeTitle: enrollment.programme.title,
          programmeSlug: enrollment.programme.slug,
          cohortName: enrollment.cohort.name,
          cohortCode: enrollment.cohort.cohortCode,
          mode: enrollment.cohort.mode,
          startDate: enrollment.cohort.startDate,
          endDate: enrollment.cohort.endDate,
          durationWeeks: enrollment.cohort.durationWeeks,
          issuedAt: enrollment.enrolledAt,
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setState({ kind: "error", alert: describeError(err) });
    }
  }, [enrollmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Portrait A4 when printed; only the letter goes to paper. */}
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/student"
          className="text-xs font-mono text-editorial-muted hover:text-ink"
        >
          ← Back to dashboard
        </Link>
        {state.kind === "ready" && <PrintButton />}
      </div>

      {state.kind === "loading" && <PageLoader label="Preparing your offer letter…" />}

      {state.kind === "error" && (
        <FormAlert alert={state.alert} onRetry={() => void load()} />
      )}

      {state.kind === "unavailable" && (
        <div className="animate-reveal mx-auto max-w-xl space-y-3 border border-editorial-border bg-editorial-surface p-8 text-center">
          <h1 className="font-heading text-2xl font-bold">{state.title}</h1>
          <p className="text-sm text-editorial-muted">{state.message}</p>
          <Link
            href="/dashboard/student"
            className="inline-block border border-ink px-4 py-2 text-xs font-medium uppercase tracking-wider hover:bg-ink hover:text-canvas"
          >
            Go to dashboard
          </Link>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="animate-reveal">
          <OfferLetterDocument data={state.letter} />
        </div>
      )}
    </div>
  );
}
