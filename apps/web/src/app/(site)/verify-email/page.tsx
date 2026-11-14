"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { ByteHubLogo } from "../../../components/brand/ByteHubLogo";
import { apiFetch, getStoredUser } from "../../../lib/api";
import {
  FormAlert,
  describeError,
  makeAlert,
  successAlert,
  type AlertInfo,
} from "../../../components/ui/FormAlert";

const EMAIL_VERIFIED = successAlert(
  "You can now use every part of your account.",
  "Your email address is verified"
);
const LINK_RESENT = successAlert(
  "Check your inbox (and spam folder).",
  "A new link is on its way"
);

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<"verifying" | "verified" | "failed">(
    token ? "verifying" : "failed"
  );
  const [message, setMessage] = useState<AlertInfo | null>(
    token
      ? null
      : makeAlert(
          "notFound",
          "This verification link is incomplete",
          "Open the link from your email again, or request a new one."
        )
  );
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [dashboardHref, setDashboardHref] = useState("/auth?mode=login");

  // Verification tokens are single-use, so the request must go out exactly once.
  const sent = useRef(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setDashboardHref(
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "COMPANY"
            ? "/dashboard/company"
            : "/dashboard/student"
      );
    }

    if (!token || sent.current) return;
    sent.current = true;

    apiFetch("/auth/verify-email/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setState("verified"))
      .catch((err: unknown) => {
        setState("failed");
        setMessage(
          describeError(err, "This verification link is invalid or has expired.")
        );
      });
  }, [token]);

  const handleResend = async () => {
    const user = getStoredUser();
    if (!user) return;
    setResendState("sending");
    try {
      await apiFetch("/auth/verify-email/request", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
      setResendState("sent");
    } catch (err) {
      setResendState("idle");
      setMessage(
        describeError(err, "A new link could not be sent. Please try again shortly.")
      );
    }
  };

  const canResend = state === "failed" && !!getStoredUser();

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center flex flex-col items-center">
          <Link
            href="/"
            aria-label="ByteHUB Home"
            className="inline-flex items-center justify-center"
          >
            <ByteHubLogo variant="light" size="lg" withTagline />
          </Link>
        </div>

        <Card padding="lg" className="space-y-5">
          {state === "verifying" && (
            <p className="font-mono text-xs text-editorial-muted">
              Verifying your email address...
            </p>
          )}

          {state === "verified" && (
            <>
              <FormAlert alert={EMAIL_VERIFIED} />
              <Link href={dashboardHref}>
                <Button variant="primary" fullWidth size="md">
                  Continue
                </Button>
              </Link>
            </>
          )}

          {state === "failed" && (
            <>
              <FormAlert alert={message} />

              {resendState === "sent" ? (
                <FormAlert alert={LINK_RESENT} />
              ) : canResend ? (
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  size="md"
                  isLoading={resendState === "sending"}
                  onClick={handleResend}
                >
                  Email me a new link
                </Button>
              ) : (
                <p className="font-sans text-xs text-editorial-muted">
                  <Link href="/auth?mode=login" className="text-ink underline">
                    Sign in
                  </Link>{" "}
                  to request a new verification link.
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center font-mono text-xs text-editorial-muted">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
