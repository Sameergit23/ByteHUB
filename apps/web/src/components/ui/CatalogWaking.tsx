"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { FormAlert, makeAlert } from "./FormAlert";

const RETRY_EVERY_MS = 8000;
const MAX_AUTO_RETRIES = 8;

/**
 * Shown instead of a crash when a page's data can't be loaded because our server is asleep
 * (Render's free plan) or restarting. It reloads the page's data by itself every few seconds,
 * so the real page appears as soon as the server answers.
 */
export function CatalogWaking({
  what,
  backHref,
  backLabel,
}: {
  /** What is loading, e.g. "programme" or "internship". */
  what: string;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const gaveUp = tries >= MAX_AUTO_RETRIES;

  useEffect(() => {
    if (gaveUp) return;
    const timer = window.setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, RETRY_EVERY_MS);
    return () => window.clearTimeout(timer);
  }, [tries, gaveUp, router]);

  const alert = useMemo(
    () =>
      gaveUp
        ? makeAlert(
            "waking",
            `This ${what} still couldn't load`,
            "Our server didn't answer. Please try again in a minute."
          )
        : makeAlert(
            "waking",
            `Loading this ${what}…`,
            "Our server was resting and is waking up. This page will load by itself in a few seconds."
          ),
    [gaveUp, what]
  );

  return (
    <div className="w-full bg-canvas min-h-[60vh] py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <FormAlert alert={alert} />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setTries(0);
              router.refresh();
            }}
          >
            Try again
          </Button>
          <Link href={backHref}>
            <Button variant="outline">{backLabel}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
