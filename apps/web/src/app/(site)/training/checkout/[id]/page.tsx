"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  ApiError,
  getStoredUser,
  redirectToLogin,
} from "../../../../../lib/api";
import { loadCashfreeSdk, openCashfreeCheckout } from "../../../../../lib/cashfree";
import { formatDate, formatMoney } from "../../../../../lib/format";
import { ByteHubLogo } from "../../../../../components/brand/ByteHubLogo";
import { siteConfig } from "../../../../../lib/siteConfig";
import {
  FormAlert,
  describeError,
  makeAlert,
  type AlertInfo,
} from "../../../../../components/ui/FormAlert";
import { Spinner } from "../../../../../components/ui/Loader";

interface CohortSummary {
  id: string;
  cohortCode: string;
  name: string;
  mode: string;
  startDate: string;
  durationWeeks: number;
  seatsLeft: number;
  priceAmount: number;
  currency: string;
  programme: { id: string; slug: string; title: string; summary: string };
}

interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  paymentSessionId?: string;
  cashfreeEnv?: "PRODUCTION" | "SANDBOX";
  isTestMode?: boolean;
  reservedUntil?: string | null;
}

interface PaymentStatusResponse {
  orderId: string;
  status: "CREATED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  isPaid: boolean;
  amount: number;
  currency: string;
  provider: "CASHFREE" | "RAZORPAY" | "STRIPE";
  invoice?: {
    invoiceNumber: string;
    issueDate: string;
    legalAndTax: {
      gstNotice: string;
      accountantReminder: string;
    };
  } | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Cashfree's browser SDK ships no types */

const newIdempotencyKey = () =>
  `bh_pay_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

const COHORT_LOAD_FAILED = makeAlert(
  "waking",
  "Couldn't load this programme yet",
  "Our server may be waking up. Try again in a few seconds."
);

export default function TrainingCheckoutPage() {
  const params = useParams();
  const cohortId = (params?.id as string) || "";

  const [cohort, setCohort] = useState<CohortSummary | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not_found" | "error">(
    "loading"
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [payAlert, setPayAlert] = useState<AlertInfo | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // One key per payment attempt: repeating the request (double click, retry after closing the
  // payment window) returns the same order instead of creating a second one.
  const idempotencyKey = useRef<string>(newIdempotencyKey());

  // Load the cohort being purchased
  useEffect(() => {
    if (!cohortId) return;
    let cancelled = false;

    apiFetch<{ data: CohortSummary }>(`/training/cohorts/${encodeURIComponent(cohortId)}`)
      .then((res) => {
        if (cancelled) return;
        setCohort(res.data);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState(
          err instanceof ApiError && err.status === 404 ? "not_found" : "error"
        );
      });

    return () => {
      cancelled = true;
    };
  }, [cohortId]);

  // Countdown for the 15-minute seat hold (starts once the server has reserved the seat)
  useEffect(() => {
    if (!order?.reservedUntil || paymentStatus?.isPaid) return;
    const deadline = new Date(order.reservedUntil).getTime();

    const tick = () =>
      setSecondsRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [order?.reservedUntil, paymentStatus?.isPaid]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  /**
   * Asks the server whether the order is paid. The server re-checks with Cashfree itself;
   * nothing shown on this page is taken from the browser's word.
   */
  const confirmWithServer = useCallback(async (orderId: string): Promise<boolean> => {
    setAwaitingConfirmation(true);

    // The gateway can take a few seconds to settle, so poll briefly before giving up.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await apiFetch("/payments/cashfree/verify-client", {
          method: "POST",
          body: JSON.stringify({ orderId }),
        });
        const res = await apiFetch<{ data: PaymentStatusResponse }>(
          `/payments/status/${encodeURIComponent(orderId)}`
        );
        if (res.data.isPaid) {
          setPaymentStatus(res.data);
          setAwaitingConfirmation(false);
          return true;
        }
        if (res.data.status === "FAILED") break;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          redirectToLogin();
          return false;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    setAwaitingConfirmation(false);
    return false;
  }, []);

  const handleInitiatePayment = async () => {
    const user = getStoredUser();
    if (!user) {
      redirectToLogin(`/training/checkout/${cohortId}`);
      return;
    }
    if (user.role === "COMPANY") {
      setPayAlert(
        makeAlert(
          "forbidden",
          "Company accounts can't enrol",
          "Sign in with a student account to join a training programme."
        )
      );
      return;
    }

    setIsProcessing(true);
    setPayAlert(null);
    let leavingPage = false;

    try {
      // 1. The server reserves the seat and decides the amount from its own database.
      const res = await apiFetch<{ data: PaymentOrder }>("/payments/create-intent", {
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          cohortId,
          provider: "CASHFREE",
          idempotencyKey: idempotencyKey.current,
        }),
      });

      const orderData = res.data;
      // A repeated request returns the same order without the hold time; keep the one we have.
      setOrder((prev) => ({
        ...orderData,
        reservedUntil: orderData.reservedUntil ?? prev?.reservedUntil ?? null,
      }));

      if (orderData.status === "PAID") {
        await confirmWithServer(orderData.orderId);
        return;
      }

      // 2. Local development without gateway keys: the API runs a labelled test mode and
      //    confirms the order itself. This branch cannot occur against a production API.
      if (orderData.isTestMode) {
        const paid = await confirmWithServer(orderData.orderId);
        if (!paid)
          setPayAlert(
            makeAlert("payment", "Test payment not confirmed", "Please try again.")
          );
        return;
      }

      // 3. Real payment: open Cashfree's hosted checkout.
      if (!orderData.paymentSessionId) {
        throw new Error(
          "The payment gateway did not return a checkout session. Please retry."
        );
      }

      const Cashfree = await loadCashfreeSdk();
      if (!Cashfree) {
        throw new Error(
          "The secure payment window could not be loaded. Check your connection or disable any content blocker, then retry."
        );
      }

      // Cashfree's own page opens in this tab and brings the student back to
      // /training/checkout/return, which confirms the payment with our server.
      const result = await openCashfreeCheckout(
        Cashfree,
        orderData.paymentSessionId,
        orderData.cashfreeEnv
      );
      if (result.redirecting) {
        leavingPage = true;
        return;
      }

      // 4. Whatever the gateway reports, the server has the final say.
      const paid = await confirmWithServer(orderData.orderId);
      if (!paid) {
        setPayAlert(
          makeAlert(
            "payment",
            "Payment not completed",
            `${result.error ? `${result.error}. ` : ""}No money has been taken. You can try again while your seat is held.`
          )
        );
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin(`/training/checkout/${cohortId}`);
        return;
      }
      // A fresh key lets the next click start a clean attempt after a hard failure.
      idempotencyKey.current = newIdempotencyKey();
      setPayAlert(
        describeError(err, "The payment could not be started. Please try again.")
      );
    } finally {
      if (!leavingPage) setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = () => {
    const orderId = paymentStatus?.orderId || order?.orderId;
    if (!orderId) return;
    window.open(`/api/payments/${encodeURIComponent(orderId)}/invoice`, "_blank");
  };

  const priceLabel = cohort ? formatMoney(cohort.priceAmount, cohort.currency) : "";
  const holdExpired =
    secondsRemaining !== null && secondsRemaining <= 0 && !paymentStatus?.isPaid;
  const soldOut = !!cohort && cohort.seatsLeft <= 0 && !order;

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#16150F] font-sans antialiased">
      {/* Top Bar Navigation */}
      <nav className="border-b border-[#D8D3C4] px-6 py-4 flex items-center justify-between bg-[#F5F2EA]">
        <Link href="/" className="inline-flex items-center" aria-label="ByteHUB Home">
          <ByteHubLogo variant="light" size="sm" />
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/training" className="text-[#5A574D] hover:text-[#16150F]">
            ← Return to programmes
          </Link>
          {order?.isTestMode && (
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-[#B8341A] text-[#B8341A]">
              Test mode — no real payment
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loadState === "loading" && (
          <p className="font-mono text-xs text-[#5A574D]">Loading cohort details...</p>
        )}

        {loadState === "not_found" && (
          <div className="bg-[#FAF8F3] border border-[#D8D3C4] p-8 space-y-4">
            <h1 className="font-heading text-2xl font-bold">
              This cohort is not open for enrolment.
            </h1>
            <p className="text-sm text-[#5A574D]">
              It may have closed or the link may be out of date.
            </p>
            <Link
              href="/training"
              className="inline-block px-6 py-3 bg-[#16150F] text-[#F5F2EA] font-medium text-sm"
            >
              Browse programmes
            </Link>
          </div>
        )}

        {loadState === "error" && (
          <FormAlert
            alert={COHORT_LOAD_FAILED}
            onRetry={() => window.location.reload()}
          />
        )}

        {loadState === "ready" && cohort && paymentStatus?.isPaid && (
          /* ================================================================ */
          /* Payment Confirmed State (confirmed by the server with the gateway) */
          /* ================================================================ */
          <div className="bg-[#FAF8F3] border border-[#D8D3C4] p-8 md:p-12">
            <div className="inline-block px-3 py-1 bg-[#16150F] text-[#F5F2EA] text-xs font-mono uppercase tracking-wider mb-6">
              Payment Confirmed & Verified
            </div>

            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Your seat is confirmed.
            </h1>
            <p className="text-[#5A574D] text-base mb-8 max-w-xl">
              Your payment for {cohort.programme.title} has been verified with the payment
              gateway and your enrolment is active. A receipt has been emailed to you.
            </p>

            {/* Receipt Summary Card */}
            <div className="border border-[#D8D3C4] bg-[#F5F2EA] p-6 mb-8 font-mono text-xs space-y-3">
              <div className="flex justify-between border-b border-[#D8D3C4] pb-2">
                <span className="text-[#5A574D]">Order ID:</span>
                <span className="font-bold text-[#16150F]">{paymentStatus.orderId}</span>
              </div>
              <div className="flex justify-between border-b border-[#D8D3C4] pb-2">
                <span className="text-[#5A574D]">Status:</span>
                <span className="font-bold text-[#B8341A]">PAID / ACTIVE ENROLMENT</span>
              </div>
              <div className="flex justify-between border-b border-[#D8D3C4] pb-2">
                <span className="text-[#5A574D]">Amount Paid:</span>
                <span className="font-bold text-[#16150F]">
                  {formatMoney(paymentStatus.amount, paymentStatus.currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#D8D3C4] pb-2">
                <span className="text-[#5A574D]">Gateway:</span>
                <span className="font-bold text-[#16150F]">{paymentStatus.provider}</span>
              </div>
              {paymentStatus.invoice && (
                <div className="pt-2 text-[#5A574D]">
                  <p>{paymentStatus.invoice.legalAndTax.gstNotice}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="px-6 py-3 bg-[#16150F] text-[#F5F2EA] font-medium text-sm hover:bg-[#333129] transition-colors"
              >
                Download Receipt (PDF)
              </button>
              <Link
                href="/dashboard/student"
                className="px-6 py-3 border border-[#16150F] text-[#16150F] font-medium text-sm hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
              >
                Go to Student Dashboard →
              </Link>
            </div>
          </div>
        )}

        {loadState === "ready" && cohort && !paymentStatus?.isPaid && (
          /* ================================================================ */
          /* Standard Checkout Screen                                         */
          /* ================================================================ */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Programme & Reservation Summary */}
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="text-[#B8341A] text-xs font-mono uppercase tracking-wider font-semibold">
                  Enrolment Checkout
                </span>
                <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mt-1">
                  {cohort.programme.title}
                </h1>
                <p className="text-[#5A574D] text-sm mt-2">
                  {cohort.name} · {cohort.durationWeeks} weeks · {cohort.mode} · Starts{" "}
                  {formatDate(cohort.startDate)}
                </p>
              </div>

              {/* Seat status */}
              <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4 flex items-center justify-between">
                {secondsRemaining !== null ? (
                  <>
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#5A574D] block font-mono">
                        Temporary Seat Hold
                      </span>
                      <span className="text-sm font-medium text-[#16150F]">
                        {holdExpired
                          ? "Your seat hold has expired."
                          : "Your seat is reserved for:"}
                      </span>
                    </div>
                    <div className="font-mono text-xl font-bold text-[#B8341A] tracking-wider">
                      {formatTimer(secondsRemaining)}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#5A574D] block font-mono">
                        Availability
                      </span>
                      <span className="text-sm font-medium text-[#16150F]">
                        A seat is held for you for 15 minutes once you proceed to pay.
                      </span>
                    </div>
                    <div
                      className="font-mono text-sm font-bold text-[#B8341A]"
                      data-testid="seats-remaining"
                    >
                      {cohort.seatsLeft > 0
                        ? `${cohort.seatsLeft} seats left`
                        : "Sold out"}
                    </div>
                  </>
                )}
              </div>

              {/* Payment method */}
              <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-3">
                <h2 className="font-heading text-lg font-bold">Payment Method</h2>
                <div className="p-4 border border-[#B8341A] bg-[#F5F2EA]">
                  <span className="font-medium text-sm text-[#16150F] block">
                    Cashfree Payments (UPI, Cards, Netbanking, Wallets)
                  </span>
                  <span className="text-xs text-[#5A574D] mt-0.5 block">
                    Pay in INR (₹) with Google Pay, PhonePe, Paytm, RuPay, cards, or any
                    major bank. You choose the method in the secure payment window.
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#5A574D] space-y-1">
                <p>
                  <strong>Security Assurance:</strong> Card and sensitive payment
                  credentials NEVER touch our servers or logs. Payments are handled
                  directly by a PCI-DSS Level 1 certified gateway.
                </p>
                <p>
                  The fee is set by ByteHUB&apos;s server and confirmed with the gateway
                  before your seat is activated.
                </p>
              </div>
            </div>

            {/* Right Column: Fee Ledger Card */}
            <div className="md:col-span-5">
              <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 sticky top-8">
                <h2 className="font-heading text-lg font-bold border-b border-[#D8D3C4] pb-3 mb-4">
                  Fee Breakdown
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-[#5A574D]">
                    <span>Programme Tuition</span>
                    <span>{priceLabel}</span>
                  </div>
                  <div className="flex justify-between text-[#5A574D]">
                    <div>
                      <span>Taxes (GST)</span>
                      <span className="block text-[10px] text-[#5A574D]">
                        Not charged (exempt — small enterprise under Sec 22 CGST Act)
                      </span>
                    </div>
                    <span>{formatMoney(0, cohort.currency)}</span>
                  </div>
                  <div className="border-t border-[#D8D3C4] pt-3 flex justify-between font-bold text-base text-[#16150F]">
                    <span>Total Payable</span>
                    <span className="text-[#B8341A]">{priceLabel}</span>
                  </div>
                </div>

                <FormAlert alert={payAlert} className="mt-4" />

                {awaitingConfirmation && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <Spinner className="h-3.5 w-3.5" />
                    <span>Confirming your payment with the gateway...</span>
                  </div>
                )}

                {holdExpired ? (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="w-full mt-6 py-3.5 bg-[#16150F] text-white font-medium text-sm uppercase tracking-wider"
                  >
                    Start again
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={isProcessing || awaitingConfirmation || soldOut}
                    className="w-full mt-6 py-3.5 bg-[#B8341A] text-white font-medium text-sm hover:bg-[#962B15] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    {soldOut
                      ? "Sold out"
                      : isProcessing
                        ? "Connecting to Gateway..."
                        : `Proceed to Pay ${priceLabel}`}
                  </button>
                )}

                <p className="mt-3 text-[11px] text-[#5A574D] text-center">
                  By clicking Proceed, you agree to the{" "}
                  <Link href="/terms" target="_blank" className="underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/refund-policy" target="_blank" className="underline">
                    Refund &amp; Cancellation Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Colophon Footer */}
      <footer className="border-t border-[#D8D3C4] mt-24 py-6 px-6 text-xs text-[#5A574D] flex flex-col sm:flex-row items-center justify-between max-w-4xl mx-auto">
        <div>
          {siteConfig.brandName} · {siteConfig.contact.city}
        </div>
        <div className="mt-2 sm:mt-0 font-mono">
          {siteConfig.contact.admissionsEmail} · {siteConfig.contact.phone}
        </div>
      </footer>
    </div>
  );
}
