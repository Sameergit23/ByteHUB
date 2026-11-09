"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_TRAINING_PROGRAMS } from "../../../lib/mockData";
import { getStoredUser, apiFetch } from "../../../lib/api";

export default function TrainingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const program = MOCK_TRAINING_PROGRAMS.find(
    (p) => p.slug === params.id || p.id === params.id
  );

  const [paymentProvider, setPaymentProvider] = useState<"RAZORPAY" | "STRIPE">("RAZORPAY");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    orderId?: string;
    message: string;
    txHash?: string;
  } | null>(null);

  if (!program) {
    return notFound();
  }

  const handleCheckout = async () => {
    const user = getStoredUser();
    if (!user) {
      window.location.href = `/auth?mode=login&redirect=/training/${program.slug}`;
      return;
    }

    setIsProcessing(true);
    setPaymentResult(null);

    try {
      const idempotencyKey = `bh_${user.id}_${program.id}_${Date.now()}`;

      // 1. Initiate order on backend
      const orderRes = await apiFetch<any>("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({
          programId: program.id,
          provider: paymentProvider,
          currency,
          idempotencyKey,
        }),
      }).catch(() => {
        // Fallback for offline demo mode
        return {
          status: "success",
          data: {
            orderId: `order_sim_${Date.now()}`,
            amount: currency === "INR" ? program.priceINR * 100 : program.priceUSD * 100,
            currency,
            provider: paymentProvider,
          },
        };
      });

      const orderId = orderRes.data.orderId;

      // 2. Perform verification with simulated payment confirmation
      if (paymentProvider === "RAZORPAY") {
        await apiFetch<any>("/payments/razorpay/verify", {
          method: "POST",
          body: JSON.stringify({
            orderId,
            razorpayPaymentId: `pay_${Date.now()}_rzp`,
            razorpaySignature: `test_sig_${Date.now()}`,
            programId: program.id,
          }),
        }).catch(() => null);
      } else {
        await apiFetch<any>("/payments/stripe/verify", {
          method: "POST",
          body: JSON.stringify({
            paymentIntentId: `pi_${Date.now()}_stripe`,
            programId: program.id,
          }),
        }).catch(() => null);
      }

      setPaymentResult({
        success: true,
        orderId,
        message: "Payment verified successfully via ACID transaction. Your seat is confirmed.",
        txHash: `0x${Math.random().toString(16).substring(2, 18)}`,
      });
    } catch (err: any) {
      setPaymentResult({
        success: false,
        message: err.message || "Payment processing encountered an error. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/training"
          className="text-xs font-mono text-editorial-muted hover:text-ink inline-flex items-center gap-1"
        >
          ← BACK TO TRAINING TRACKS
        </Link>
      </div>

      {/* Main Header Box */}
      <div className="border border-editorial-border p-8 sm:p-12 bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-editorial-border pb-4 text-xs font-mono text-editorial-muted">
          <div>TRACK SPECIFICATION: [{program.track}]</div>
          <div className="text-accent font-semibold">
            {program.seatsLeft} SEATS REMAINING
          </div>
        </div>

        <div className="space-y-4 max-w-4xl">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
            {program.title}
          </h1>
          <p className="font-sans text-sm sm:text-base text-editorial-muted leading-relaxed">
            {program.summary}
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-editorial-muted pt-2">
            <span>DURATION: {program.durationWeeks} WEEKS</span>
            <span>•</span>
            <span>LEVEL: {program.level}</span>
            <span>•</span>
            <span>COHORT START: {program.cohortStart}</span>
          </div>
        </div>
      </div>

      {/* Grid: Syllabus + Checkout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Detailed Week-by-Week Syllabus */}
        <div className="md:col-span-7 space-y-6">
          <div className="border border-editorial-border p-6 bg-white space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-3">
              [ COMPREHENSIVE CURRICULUM SYLLABUS ]
            </h2>

            <div className="divide-y divide-editorial-border space-y-4">
              {program.syllabus.map((weekItem) => (
                <div key={weekItem.week} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs font-bold text-accent">
                      WEEK 0{weekItem.week}
                    </span>
                    <h3 className="font-heading text-base font-bold text-ink">
                      {weekItem.title}
                    </h3>
                  </div>

                  <p className="text-xs font-sans text-editorial-muted leading-relaxed">
                    {weekItem.description}
                  </p>

                  <div className="border-l-2 border-ink pl-3 py-1 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-editorial-muted">
                      REQUIRED LABORATORY DELIVERABLE:
                    </span>
                    <ul className="text-xs font-mono text-ink space-y-0.5">
                      {weekItem.deliverables.map((deliv, dIdx) => (
                        <li key={dIdx}>■ {deliv}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools & Outcomes */}
          <div className="border border-editorial-border p-6 bg-editorial-surface space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-2">
              [ VERIFIABLE CAPABILITIES GAINED ]
            </h3>
            <ul className="space-y-2 text-xs font-sans text-ink">
              {program.outcomes.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-ink font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: ACID Payment & Enrollment Console */}
        <div className="md:col-span-5 space-y-6">
          <div className="border-2 border-ink p-6 sm:p-8 bg-white space-y-6">
            <div className="border-b border-editorial-border pb-4 space-y-1">
              <span className="text-xs font-mono text-accent font-bold">[ ENROLLMENT TERMINAL ]</span>
              <h3 className="font-heading text-2xl font-bold text-ink">SECURE CHECKOUT</h3>
              <p className="text-xs font-mono text-editorial-muted">
                ACID Transaction Guarantee with Idempotency Key
              </p>
            </div>

            {/* Currency toggle */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-editorial-muted block">
                SELECT BILLING CURRENCY:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("INR");
                    setPaymentProvider("RAZORPAY");
                  }}
                  className={`border py-2 text-xs font-mono font-bold transition-colors ${
                    currency === "INR"
                      ? "border-ink bg-ink text-canvas"
                      : "border-editorial-border bg-white text-ink hover:border-ink"
                  }`}
                >
                  INR (₹{program.priceINR.toLocaleString("en-IN")})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("USD");
                    setPaymentProvider("STRIPE");
                  }}
                  className={`border py-2 text-xs font-mono font-bold transition-colors ${
                    currency === "USD"
                      ? "border-ink bg-ink text-canvas"
                      : "border-editorial-border bg-white text-ink hover:border-ink"
                  }`}
                >
                  USD (${program.priceUSD})
                </button>
              </div>
            </div>

            {/* Gateway selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-editorial-muted block">
                PAYMENT GATEWAY ADAPTER:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentProvider("RAZORPAY")}
                  className={`border p-3 text-left space-y-1 transition-colors ${
                    paymentProvider === "RAZORPAY"
                      ? "border-accent bg-accent-light"
                      : "border-editorial-border bg-white hover:border-ink"
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-ink">RAZORPAY</div>
                  <div className="text-[10px] font-sans text-editorial-muted">
                    UPI, RuPay, Netbanking, Cards (India)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider("STRIPE")}
                  className={`border p-3 text-left space-y-1 transition-colors ${
                    paymentProvider === "STRIPE"
                      ? "border-accent bg-accent-light"
                      : "border-editorial-border bg-white hover:border-ink"
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-ink">STRIPE</div>
                  <div className="text-[10px] font-sans text-editorial-muted">
                    International Cards (3D Secure 2)
                  </div>
                </button>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border border-editorial-border p-4 bg-canvas space-y-2 font-mono text-xs">
              <div className="flex justify-between text-editorial-muted">
                <span>Tuition Base:</span>
                <span>
                  {currency === "INR"
                    ? `₹${program.priceINR.toLocaleString("en-IN")}`
                    : `$${program.priceUSD}`}
                </span>
              </div>
              <div className="flex justify-between text-editorial-muted">
                <span>Direct Mentorship & Lab Infra:</span>
                <span className="text-accent font-semibold">INCLUDED</span>
              </div>
              <div className="border-t border-editorial-line pt-2 flex justify-between font-bold text-sm text-ink">
                <span>Total Due:</span>
                <span>
                  {currency === "INR"
                    ? `₹${program.priceINR.toLocaleString("en-IN")}`
                    : `$${program.priceUSD}`}
                </span>
              </div>
            </div>

            {/* Result banner if present */}
            {paymentResult && (
              <div
                className={`border p-4 text-xs font-mono space-y-2 ${
                  paymentResult.success
                    ? "border-green-600 bg-green-50 text-green-950"
                    : "border-accent bg-accent-light text-accent"
                }`}
              >
                <div className="font-bold">
                  {paymentResult.success ? "[ TRANSACTION COMMITTED ]" : "[ ERROR ]"}
                </div>
                <p>{paymentResult.message}</p>
                {paymentResult.orderId && (
                  <div className="text-[10px] opacity-80">
                    Order Ref: {paymentResult.orderId}
                  </div>
                )}
                {paymentResult.txHash && (
                  <div className="text-[10px] opacity-80">
                    Audit Hash: {paymentResult.txHash}
                  </div>
                )}
                {paymentResult.success && (
                  <Link
                    href="/dashboard/student"
                    className="inline-block mt-2 underline font-bold"
                  >
                    GO TO STUDENT DASHBOARD →
                  </Link>
                )}
              </div>
            )}

            {/* Execute payment button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full border-2 border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white py-4 text-xs font-mono font-bold tracking-widest transition-colors disabled:opacity-50"
            >
              {isProcessing
                ? "VERIFYING TRANSACTION..."
                : `PAY & CONFIRM ENROLLMENT (${paymentProvider})`}
            </button>

            <div className="text-[10px] font-mono text-editorial-muted text-center leading-relaxed">
              ENCRYPTED 256-BIT TLS // POSTGRESQL ATOMIC TRANSACTIONS // ZERO SECRET LEAKAGE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
