"use client";

import { useEffect, useState } from "react";

export function CookieConsent() {
  const [hasDecided, setHasDecided] = useState<boolean>(true); // default true to avoid flash
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("bh_cookie_consent");
    if (!saved) {
      setHasDecided(false);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setAnalyticsEnabled(parsed.analytics ?? false);
      } catch {
        setHasDecided(false);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      "bh_cookie_consent",
      JSON.stringify({ essential: true, analytics: true, decidedAt: new Date().toISOString() })
    );
    setAnalyticsEnabled(true);
    setHasDecided(true);
  };

  const handleAcceptEssentialOnly = () => {
    localStorage.setItem(
      "bh_cookie_consent",
      JSON.stringify({ essential: true, analytics: false, decidedAt: new Date().toISOString() })
    );
    setAnalyticsEnabled(false);
    setHasDecided(true);
  };

  if (hasDecided) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#F5F2EA] border-t border-[#D8D3C4] px-6 py-5 shadow-sm"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-wider text-[#B8341A] font-semibold">
            Privacy & Cookie Policy
          </p>
          <p className="text-xs text-[#5A574D] leading-relaxed">
            ByteHUB uses essential cookies for secure session management, CSRF defense, and payment
            routing. Optional privacy-preserving analytics help us measure programme demand. Card
            numbers and biometric credentials never touch ByteHUB servers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAcceptEssentialOnly}
            className="px-4 py-2 text-xs border border-[#16150F] text-[#16150F] hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-4 py-2 text-xs bg-[#B8341A] text-white hover:bg-[#962B15] transition-colors font-medium"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

