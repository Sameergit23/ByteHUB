"use client";

import { useState } from "react";
import { apiFetch, logout } from "../../lib/api";
import { ByteHubLogo } from "../brand/ByteHubLogo";
import { Button, FormError, inputClass } from "./ui";
import { adminErrorMessage } from "./useAdminResource";
import type { Envelope } from "./types";

interface SetupData {
  qrDataUrl: string;
  manualKey: string;
}

/**
 * Required before a staff member can use the admin panel: link an authenticator app
 * (Google Authenticator, Microsoft Authenticator, Authy…), confirm with a code, then save the
 * one-time backup codes.
 */
export function TwoFactorSetup({ name, onDone }: { name: string; onDone: () => void }) {
  const [step, setStep] = useState<"intro" | "scan" | "codes">("intro");
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Envelope<SetupData>>("/auth/2fa/setup", {
        method: "POST",
        body: "{}",
      });
      setSetup(res.data);
      setStep("scan");
    } catch (err) {
      setError(adminErrorMessage(err, "Setup could not start. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code shown in your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Envelope<{ backupCodes: string[] }>>(
        "/auth/2fa/enable",
        {
          method: "POST",
          body: JSON.stringify({ code: code.trim() }),
        }
      );
      setBackupCodes(res.data.backupCodes);
      setStep("codes");
    } catch (err) {
      setError(adminErrorMessage(err, "That code didn't work. Try the newest code."));
    } finally {
      setBusy(false);
    }
  };

  const codesText = () =>
    `ByteHUB admin backup codes for ${name}\nEach code works once. Keep them somewhere safe.\n\n${backupCodes.join("\n")}\n`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([codesText()], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bytehub-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codesText());
      setSaved(true);
    } catch {
      setError("Copying didn't work. Download the file instead.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 font-sans text-zinc-900">
      <div className="w-full max-w-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <ByteHubLogo variant="light" size="sm" height={22} />
          <span className="text-xs font-medium text-zinc-500">Admin security</span>
        </div>

        <div className="space-y-5 px-6 py-6">
          <FormError message={error} />

          {step === "intro" && (
            <>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold">Turn on two-factor sign-in</h1>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Every ByteHUB staff account needs a second step at sign-in: a 6-digit
                  code from an app on your phone. Even if someone learns your password,
                  they can&apos;t get into the admin panel without your phone.
                </p>
              </div>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-700">
                <li>
                  Install a free authenticator app: <strong>Google Authenticator</strong>,{" "}
                  <strong>Microsoft Authenticator</strong> or <strong>Authy</strong>.
                </li>
                <li>Scan the QR code we show you next.</li>
                <li>Type the 6-digit code from the app to confirm.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={start} disabled={busy}>
                  {busy ? "Starting…" : "Start setup"}
                </Button>
                <Button
                  onClick={async () => {
                    await logout();
                    window.location.assign("/auth?mode=login");
                  }}
                >
                  Sign out
                </Button>
              </div>
            </>
          )}

          {step === "scan" && setup && (
            <form onSubmit={confirm} className="space-y-5" noValidate>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold">Scan this code with the app</h1>
                <p className="text-sm text-zinc-600">
                  In the app, tap <strong>+</strong> (or &ldquo;Add account&rdquo;), then
                  &ldquo;Scan a QR code&rdquo;.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-start">
                <img
                  src={setup.qrDataUrl}
                  alt="QR code for your authenticator app"
                  width={180}
                  height={180}
                  className="h-[180px] w-[180px] bg-white"
                />
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium text-zinc-800">Can&apos;t scan?</p>
                  <p className="text-zinc-600">
                    Choose &ldquo;Enter a setup key&rdquo; and type:
                  </p>
                  <p className="break-all bg-white px-2 py-1 font-mono text-sm tracking-wide text-zinc-900 ring-1 ring-zinc-200">
                    {setup.manualKey}
                  </p>
                  <p className="text-xs text-zinc-500">Account: ByteHUB · Time-based</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="setup-code"
                  className="block text-sm font-medium text-zinc-800"
                >
                  6-digit code from the app
                </label>
                <input
                  id="setup-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className={`${inputClass} max-w-[10rem] font-mono text-lg tracking-[0.3em]`}
                  data-autofocus
                />
              </div>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Checking…" : "Confirm and turn on"}
              </Button>
            </form>
          )}

          {step === "codes" && (
            <>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold">Save your backup codes</h1>
                <p className="text-sm leading-relaxed text-zinc-600">
                  If you lose your phone, each of these codes lets you sign in once
                  instead of the app code. They&apos;re shown only now. Keep them
                  somewhere safe and private, like a password manager or a printed copy.
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-2 border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm">
                {backupCodes.map((c) => (
                  <li
                    key={c}
                    className="bg-white px-2 py-1 text-center ring-1 ring-zinc-200"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button onClick={download}>Download as file</Button>
                <Button onClick={copy}>Copy</Button>
              </div>
              <label className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                  className="mt-0.5"
                />
                I&apos;ve saved my backup codes somewhere safe.
              </label>
              <Button variant="primary" onClick={onDone} disabled={!saved}>
                Continue to the admin panel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
