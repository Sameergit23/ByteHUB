"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Lets an employer type a certificate ID from a CV and check it. */
export default function VerifyLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{6,40}$/.test(value)) {
      setError("Enter the certificate ID exactly as printed, e.g. BYTE-2026-K7M2QX9D.");
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(value)}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <p className="animate-reveal font-mono text-xs font-bold uppercase tracking-wider text-accent">
        Certificate check
      </p>
      <h1 className="mt-3 animate-reveal font-heading text-4xl font-bold tracking-tight [animation-delay:80ms]">
        Verify a ByteHUB certificate
      </h1>
      <p className="mt-3 animate-reveal text-sm text-editorial-muted [animation-delay:160ms]">
        Every certificate has a unique ID printed at the bottom. Enter it to see who it
        was issued to and whether it is still valid.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 animate-reveal space-y-3 [animation-delay:240ms]"
        noValidate
      >
        <label htmlFor="certificate-code" className="block text-sm font-medium">
          Certificate ID
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="certificate-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BYTE-2026-K7M2QX9D"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "certificate-code-error" : undefined}
            className={`h-11 flex-1 border bg-white px-3 font-mono text-sm uppercase ${
              error ? "animate-shake border-accent" : "border-editorial-border"
            }`}
          />
          <button
            type="submit"
            className="h-11 bg-accent px-6 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Check certificate
          </button>
        </div>
        {error && (
          <p
            id="certificate-code-error"
            role="alert"
            className="animate-alert-in text-xs text-accent"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
