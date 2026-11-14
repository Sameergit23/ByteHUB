"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { ByteHubLogo } from "../../../components/brand/ByteHubLogo";
import { apiFetch, clearAuth } from "../../../lib/api";
import {
  FormAlert,
  describeError,
  makeAlert,
  successAlert,
  validationAlert,
  type AlertInfo,
} from "../../../components/ui/FormAlert";

function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters long.";
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Password must include uppercase, lowercase, digit, and special character.";
  }
  return null;
}

const INCOMPLETE_LINK = makeAlert(
  "notFound",
  "This reset link is incomplete",
  "Request a new one from the sign-in page."
);
const PASSWORD_UPDATED = successAlert(
  "Sign in with your new password.",
  "Your password has been updated"
);

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<AlertInfo | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const problem = passwordProblem(password);
    if (problem) {
      setError(validationAlert(problem, "Choose a stronger password"));
      return;
    }
    if (password !== confirm) {
      setError(
        validationAlert("Type the same password in both boxes.", "Passwords don't match")
      );
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      // Every session is signed out when a password changes.
      clearAuth();
      setDone(true);
    } catch (err) {
      setError(
        describeError(err, "The password could not be reset. Please request a new link.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center space-y-4 flex flex-col items-center">
          <Link
            href="/"
            aria-label="ByteHUB Home"
            className="inline-flex items-center justify-center"
          >
            <ByteHubLogo variant="light" size="lg" withTagline />
          </Link>
          <p className="font-sans text-xs sm:text-sm text-editorial-muted">
            Choose a new password for your ByteHUB account
          </p>
        </div>

        <Card padding="lg" className="space-y-6">
          {!token ? (
            <div className="space-y-4">
              <FormAlert alert={INCOMPLETE_LINK} />
              <Link
                href="/auth?mode=login"
                className="font-mono text-xs text-ink underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4">
              <FormAlert alert={PASSWORD_UPDATED} />
              <Link href="/auth?mode=login">
                <Button variant="primary" fullWidth size="md">
                  Go to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormAlert alert={error} />

              <Input
                label="New password (min 10 chars, upper, lower, num, symbol)"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label="Confirm new password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="md"
                isLoading={loading}
              >
                Update password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center font-mono text-xs text-editorial-muted">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
