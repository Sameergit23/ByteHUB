"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { formatMoney } from "../../../../lib/format";

/**
 * Landing page for payment methods that leave the site (some UPI apps and bank pages)
 * and send the student back with ?order_id=... The order is always re-checked on the server.
 */

interface PaymentStatus {
  orderId: string;
  status: string;
  isPaid: boolean;
  amount: number;
  currency: string;
}

function ReturnContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";

  const [state, setState] = useState<"checking" | "paid" | "unpaid" | "error">(
    "checking"
  );
  const [payment, setPayment] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      return;
    }

    let cancelled = false;

    const check = async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        try {
          await apiFetch("/payments/cashfree/verify-client", {
            method: "POST",
            body: JSON.stringify({ orderId }),
          });
          const res = await apiFetch<{ data: PaymentStatus }>(
            `/payments/status/${encodeURIComponent(orderId)}`
          );
          if (cancelled) return;
          setPayment(res.data);
          if (res.data.isPaid) {
            setState("paid");
            return;
          }
          if (res.data.status === "FAILED") break;
        } catch (err) {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 401) {
            redirectToLogin();
            return;
          }
          if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
            setState("error");
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      if (!cancelled) setState("unpaid");
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="bg-[#FAF8F3] border border-[#D8D3C4] p-8 md:p-12 space-y-6">
        {state === "checking" && (
          <>
            <h1 className="font-heading text-2xl font-bold">
              Confirming your payment...
            </h1>
            <p className="text-sm text-[#5A574D]">
              We are checking with the payment gateway. This usually takes a few seconds —
              please keep this page open.
            </p>
          </>
        )}

        {state === "paid" && payment && (
          <>
            <div className="inline-block px-3 py-1 bg-[#16150F] text-[#F5F2EA] text-xs font-mono uppercase tracking-wider">
              Payment Confirmed
            </div>
            <h1 className="font-heading text-3xl font-bold">Your seat is confirmed.</h1>
            <p className="text-sm text-[#5A574D]">
              We received {formatMoney(payment.amount, payment.currency)} for order{" "}
              <span className="font-mono">{payment.orderId}</span>. A receipt has been
              emailed to you.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={`/api/payments/${encodeURIComponent(payment.orderId)}/invoice`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-[#16150F] text-[#F5F2EA] font-medium text-sm"
              >
                Download Receipt (PDF)
              </a>
              <Link
                href="/dashboard/student"
                className="px-6 py-3 border border-[#16150F] text-[#16150F] font-medium text-sm"
              >
                Go to Student Dashboard →
              </Link>
            </div>
          </>
        )}

        {state === "unpaid" && (
          <>
            <h1 className="font-heading text-2xl font-bold">
              We could not confirm a payment.
            </h1>
            <p className="text-sm text-[#5A574D]">
              The gateway has not reported this order as paid. If money left your account
              it will be matched to your order automatically within 30 minutes and you
              will get a confirmation email. Otherwise you can start the checkout again.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/training"
                className="px-6 py-3 bg-[#16150F] text-[#F5F2EA] font-medium text-sm"
              >
                Back to programmes
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3 border border-[#16150F] text-[#16150F] font-medium text-sm"
              >
                Contact support
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="font-heading text-2xl font-bold">
              This payment link is not valid.
            </h1>
            <p className="text-sm text-[#5A574D]">
              We could not find an order for this link on your account.
            </p>
            <Link
              href="/dashboard/student"
              className="inline-block px-6 py-3 bg-[#16150F] text-[#F5F2EA] font-medium text-sm"
            >
              Go to Student Dashboard
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function CheckoutReturnPage() {
  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#16150F] font-sans antialiased">
      <Suspense
        fallback={
          <p className="px-6 py-16 font-mono text-xs text-[#5A574D]">
            Loading payment status...
          </p>
        }
      >
        <ReturnContent />
      </Suspense>
    </div>
  );
}
