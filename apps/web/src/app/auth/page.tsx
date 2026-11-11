"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ColophonFooter } from "../../components/layout/ColophonFooter";
import { ByteHubLogo } from "../../components/brand/ByteHubLogo";
import {
  FormAlert,
  describeError,
  successAlert,
  validationAlert,
  type AlertInfo,
} from "../../components/ui/FormAlert";
import {
  setStoredUser,
  getStoredUser,
  clearAuth,
  apiFetch,
  ApiEnvelope,
  StoredUser,
} from "../../lib/api";

/** Only same-site paths are accepted as a post-login destination (no open redirects). */
function safeRedirect(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }
  return value;
}

function homeForRole(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "COMPANY") return "/dashboard/company";
  return "/dashboard/student";
}

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlMode = searchParams.get("mode");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(
    urlMode === "signup" ? "signup" : "login"
  );
  const [role, setRole] = useState<"STUDENT" | "COMPANY">("STUDENT");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });

  const [error, setError] = useState<AlertInfo | null>(null);
  const [successMessage, setSuccessMessage] = useState<AlertInfo | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlMode === "signup" || urlMode === "login") {
      setMode(urlMode);
    }
  }, [urlMode]);

  // Someone who was signed in but whose 15-minute access cookie lapsed lands here from the
  // route guard. Renew the session quietly and send them straight back.
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    const known = getStoredUser();
    if (!known) return;

    let cancelled = false;
    setRestoring(true);
    // Asking the API who we are proves the session cookie really works (apiFetch renews an
    // expired one on the way), so this can never bounce in a loop with the route guard.
    apiFetch<ApiEnvelope<StoredUser | null>>("/auth/me")
      .then((res) => {
        if (cancelled) return;
        const me = res?.data;
        if (!me?.id) throw new Error("No active session");
        setStoredUser({
          id: me.id,
          name: me.name,
          email: me.email,
          role: me.role,
          organizationName: me.organizationName,
        });
        // Full navigation so the route guard sees the renewed cookie.
        window.location.replace(
          safeRedirect(searchParams.get("redirect")) || homeForRole(me.role)
        );
      })
      .catch(() => {
        if (cancelled) return;
        clearAuth();
        setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Forgot password flow
    if (mode === "forgot") {
      setLoading(true);
      try {
        await apiFetch("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: formData.email }),
        });

        setSuccessMessage(
          successAlert(
            "If an account exists with that email address, a password reset link is on its way. The link works for 1 hour.",
            "Check your inbox"
          )
        );
      } catch (err) {
        setError(
          describeError(err, "Could not request a password reset. Please try again.")
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign up complexity validation: min 10 chars, uppercase, lowercase, digit, special
    if (mode === "signup") {
      if (formData.password.length < 10) {
        setError(validationAlert("Use at least 10 characters.", "Password is too short"));
        return;
      }
      if (
        !/[A-Z]/.test(formData.password) ||
        !/[a-z]/.test(formData.password) ||
        !/[0-9]/.test(formData.password) ||
        !/[^A-Za-z0-9]/.test(formData.password)
      ) {
        setError(
          validationAlert(
            "Include an uppercase letter, a lowercase letter, a number and a symbol (e.g. !).",
            "Password needs more variety"
          )
        );
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await apiFetch<ApiEnvelope<{ user?: StoredUser }>>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role,
            organizationName: role === "COMPANY" ? formData.organizationName : undefined,
          }),
        });

        const user = res.data?.user;
        if (!user) {
          throw new Error("Registration succeeded but user profile was not returned.");
        }

        setStoredUser(user);
        router.push(safeRedirect(searchParams.get("redirect")) || homeForRole(user.role));
        router.refresh();
      } else {
        const res = await apiFetch<ApiEnvelope<{ user?: StoredUser }>>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const user = res.data?.user;
        if (!user) {
          throw new Error("Login succeeded but user session profile was not returned.");
        }

        setStoredUser(user);
        router.push(safeRedirect(searchParams.get("redirect")) || homeForRole(user.role));
        router.refresh();
      }
    } catch (err) {
      setError(describeError(err, "Sign-in failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (restoring) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-mono text-xs text-editorial-muted">
        Restoring your session...
      </div>
    );
  }

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16 flex flex-col justify-between">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6 space-y-6">
        {/* Header Masthead */}
        <div className="text-center space-y-4 flex flex-col items-center">
          <Link
            href="/"
            className="hover:opacity-90 transition-opacity inline-flex items-center justify-center"
            aria-label="ByteHUB Home"
          >
            <ByteHubLogo variant="light" size="lg" withTagline />
          </Link>
          <p className="font-sans text-xs sm:text-sm text-editorial-muted">
            {mode === "login"
              ? "Sign in to access your applications, courses, and pipeline"
              : mode === "signup"
                ? "Create an account to apply for internships or post openings"
                : "Enter your registered email to receive password reset instructions"}
          </p>
        </div>

        {/* Auth Card */}
        <Card padding="lg" className="space-y-6">
          {/* Mode Switcher */}
          {mode !== "forgot" ? (
            <div className="grid grid-cols-2 gap-1 border border-editorial-border p-1 bg-canvas">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 text-xs font-sans font-semibold transition-colors ${
                  mode === "login"
                    ? "bg-[#16150F] text-white"
                    : "text-editorial-muted hover:text-ink"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 text-xs font-sans font-semibold transition-colors ${
                  mode === "signup"
                    ? "bg-[#16150F] text-white"
                    : "text-editorial-muted hover:text-ink"
                }`}
              >
                Create account
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-2 border-b border-editorial-line">
              <span className="font-mono text-xs font-bold text-accent">
                [ PASSWORD RECOVERY ]
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-mono text-xs text-editorial-muted hover:text-ink underline"
              >
                Back to sign in
              </button>
            </div>
          )}

          {/* Role selector for registration */}
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="block text-xs font-sans font-semibold text-ink">
                I am registering as:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`min-h-[44px] px-3 py-2 text-xs font-sans font-semibold border transition-colors ${
                    role === "STUDENT"
                      ? "border-[#16150F] bg-[#16150F] text-white"
                      : "border-editorial-border bg-white text-editorial-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("COMPANY")}
                  className={`min-h-[44px] px-3 py-2 text-xs font-sans font-semibold border transition-colors ${
                    role === "COMPANY"
                      ? "border-[#16150F] bg-[#16150F] text-white"
                      : "border-editorial-border bg-white text-editorial-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  Company / Employer
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          <FormAlert alert={error} onRetry={() => formRef.current?.requestSubmit()} />

          {/* Success Message */}
          <FormAlert alert={successMessage} />

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Input
                  label="Full Name"
                  required
                  placeholder="e.g. Maya Sen"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                {role === "COMPANY" && (
                  <Input
                    label="Company / Organization Name"
                    required
                    placeholder="e.g. HyperGrid Systems"
                    value={formData.organizationName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        organizationName: e.target.value,
                      })
                    }
                  />
                )}
              </>
            )}

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="name@domain.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {mode !== "forgot" && (
              <div className="space-y-1">
                <Input
                  label={
                    mode === "signup"
                      ? "Password (min 10 chars, upper, lower, num, symbol)"
                      : "Password"
                  }
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {mode === "login" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="font-mono text-[11px] text-editorial-muted hover:text-ink underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="md"
              isLoading={loading}
            >
              {mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send recovery link"}
            </Button>

            {mode === "signup" && (
              <p className="text-[11px] font-sans text-editorial-muted text-center leading-relaxed">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="text-ink underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-ink underline">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </form>
        </Card>
      </div>

      {/* Colophon Footer */}
      <ColophonFooter className="mt-16" />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center font-mono text-xs text-editorial-muted">
          Loading authentication gateway...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
