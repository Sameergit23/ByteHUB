"use client";

import React from "react";
import { ApiError, redirectToLogin } from "../../lib/api";
import { Spinner } from "./Loader";

/**
 * One place that turns any failure into a message people understand, with its own look and
 * motion per kind of problem: a shake for "check your input", a spinner for "server waking
 * up", a lock for "sign in again", and so on.
 */

export type AlertKind =
  | "validation"
  | "network"
  | "waking"
  | "session"
  | "forbidden"
  | "locked"
  | "rateLimit"
  | "notFound"
  | "conflict"
  | "payment"
  | "server"
  | "success"
  | "info";

export interface AlertInfo {
  kind: AlertKind;
  title: string;
  message: string;
  /** Changes on every new alert so the entrance animation replays for repeat errors. */
  id: number;
}

let alertCounter = 0;
const nextId = () => ++alertCounter;

export function makeAlert(kind: AlertKind, title: string, message = ""): AlertInfo {
  return { kind, title, message, id: nextId() };
}

/** For checks done in the browser before anything is sent (empty field, weak password…). */
export const validationAlert = (message: string, title = "Please check your details") =>
  makeAlert("validation", title, message);

export const successAlert = (message: string, title = "Done") =>
  makeAlert("success", title, message);

const PAYMENT_CODES = new Set([
  "PAYMENT_FAILED",
  "CASHFREE_API_ERROR",
  "GATEWAY_UNAVAILABLE",
  "AMOUNT_TAMPERED",
  "INVALID_SIGNATURE",
]);

/** Classifies an error thrown by apiFetch (or anything else) into a friendly alert. */
export function describeError(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): AlertInfo {
  if (!(err instanceof ApiError)) {
    return makeAlert(
      "server",
      "Something went wrong",
      err instanceof Error && err.message ? err.message : fallback
    );
  }

  const message = err.message || fallback;
  const generic = /^Request failed \(HTTP \d+\)$/.test(message);
  const lower = message.toLowerCase();

  if (err.status === 0) {
    return makeAlert(
      "network",
      "You seem to be offline",
      "We couldn't reach ByteHUB. Check your internet connection, then try again."
    );
  }
  if (err.status >= 500) {
    return generic
      ? makeAlert(
          "waking",
          "Our server is waking up",
          "It rests when the site is quiet and takes a few seconds to start. Please try again in a moment."
        )
      : makeAlert("server", "Something went wrong on our side", message);
  }
  if (err.code === "SEATS_EXHAUSTED") {
    return makeAlert("conflict", "This cohort just filled up", message);
  }
  if (err.code && PAYMENT_CODES.has(err.code)) {
    return makeAlert("payment", "Payment problem", message);
  }

  switch (err.status) {
    case 400:
    case 422:
      return makeAlert(
        "validation",
        err.code === "VALIDATION_ERROR"
          ? "Please fix the highlighted details"
          : "Please check your details",
        message
      );
    case 401:
      if (lower.includes("password") && !lower.includes("enter your password again")) {
        return makeAlert(
          "validation",
          "Wrong email or password",
          "Check both and try again."
        );
      }
      // Two-factor sign-in: a wrong code, or the step timed out.
      if (lower.includes("code")) {
        return makeAlert("validation", "That code didn't work", message);
      }
      if (lower.includes("sign-in step")) {
        return makeAlert("session", "Sign-in step expired", message);
      }
      return makeAlert(
        "session",
        "Please sign in again",
        "Your session ended for your security."
      );
    case 403:
      if (lower.includes("locked"))
        return makeAlert("locked", "Account temporarily locked", message);
      if (
        lower.includes("csrf") ||
        lower.includes("origin") ||
        lower.includes("referer")
      ) {
        return makeAlert(
          "session",
          "Please refresh the page",
          "Your security token expired. Refresh the page, then try again."
        );
      }
      return makeAlert("forbidden", "You don't have access to this", message);
    case 404:
      return makeAlert("notFound", "Not found", message);
    case 409:
      return makeAlert("conflict", "Already done", message);
    case 429:
      return makeAlert("rateLimit", "Too many attempts", message);
    default:
      return makeAlert("server", "Something went wrong", message);
  }
}

/* ------------------------------------------------------------------------------------------ */

const STYLES: Record<
  AlertKind,
  { box: string; badge: string; motion: string; role: "alert" | "status" }
> = {
  validation: {
    box: "border-accent bg-accent-light text-ink",
    badge: "bg-accent text-white",
    motion: "animate-alert-shake",
    role: "alert",
  },
  payment: {
    box: "border-red-700 bg-red-50 text-red-950",
    badge: "bg-red-700 text-white",
    motion: "animate-alert-shake",
    role: "alert",
  },
  network: {
    box: "border-ink bg-white text-ink",
    badge: "bg-ink text-canvas",
    motion: "animate-alert-in",
    role: "alert",
  },
  waking: {
    box: "border-amber-500 bg-amber-50 text-amber-950",
    badge: "bg-amber-500 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  session: {
    box: "border-blue-600 bg-blue-50 text-blue-950",
    badge: "bg-blue-600 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  forbidden: {
    box: "border-red-800 bg-red-50 text-red-950",
    badge: "bg-red-800 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  locked: {
    box: "border-amber-600 bg-amber-50 text-amber-950",
    badge: "bg-amber-600 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  rateLimit: {
    box: "border-amber-600 bg-amber-50 text-amber-950",
    badge: "bg-amber-600 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  notFound: {
    box: "border-editorial-muted bg-editorial-surface text-ink",
    badge: "bg-editorial-muted text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  conflict: {
    box: "border-violet-600 bg-violet-50 text-violet-950",
    badge: "bg-violet-600 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  server: {
    box: "border-red-700 bg-red-50 text-red-950",
    badge: "bg-red-700 text-white",
    motion: "animate-alert-in",
    role: "alert",
  },
  success: {
    box: "border-green-700 bg-green-50 text-green-950",
    badge: "bg-green-700 text-white",
    motion: "animate-alert-pop",
    role: "status",
  },
  info: {
    box: "border-ink bg-white text-ink",
    badge: "bg-ink text-canvas",
    motion: "animate-alert-in",
    role: "status",
  },
};

const RETRYABLE = new Set<AlertKind>(["network", "waking", "server"]);

function AlertIcon({ kind }: { kind: AlertKind }) {
  if (kind === "waking") return <Spinner className="h-3.5 w-3.5" />;
  const common = {
    viewBox: "0 0 24 24",
    className: "h-3.5 w-3.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "success":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      );
    case "network":
      return (
        <svg {...common}>
          <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M14 10.3A10 10 0 0 1 19 13M12 20h.01" />
        </svg>
      );
    case "session":
    case "forbidden":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "locked":
    case "rateLimit":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "notFound":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "payment":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" />
          <path d="M2.5 10h19" />
        </svg>
      );
    case "conflict":
    case "info":
      return (
        <svg {...common}>
          <path d="M12 11v6M12 7.5h.01" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 7v6M12 16.5h.01" />
        </svg>
      );
  }
}

export function FormAlert({
  alert,
  onRetry,
  onDismiss,
  className = "",
}: {
  alert: AlertInfo | null | undefined;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!alert) return null;
  const style = STYLES[alert.kind];

  return (
    <div
      key={alert.id}
      role={style.role}
      aria-live={style.role === "alert" ? "assertive" : "polite"}
      className={`flex items-start gap-3 border-l-4 px-4 py-3 text-sm ${style.box} ${style.motion} ${className}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center ${style.badge}`}
      >
        <AlertIcon kind={alert.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{alert.title}</p>
        {alert.message && (
          <p className="mt-0.5 break-words text-[13px] opacity-90">{alert.message}</p>
        )}
        {(alert.kind === "session" || (onRetry && RETRYABLE.has(alert.kind))) && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
            {alert.kind === "session" && (
              <button
                type="button"
                onClick={() => redirectToLogin()}
                className="underline underline-offset-2"
              >
                Sign in again →
              </button>
            )}
            {onRetry && RETRYABLE.has(alert.kind) && (
              <button
                type="button"
                onClick={onRetry}
                className="underline underline-offset-2"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 shrink-0 p-0.5 opacity-60 hover:opacity-100"
          aria-label="Dismiss message"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
