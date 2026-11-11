import { apiFetch, ApiError } from "./api";

/**
 * Browser side of Cashfree payments: loading the checkout script, paying an internship's
 * registration fee, and asking the server whether an order is paid.
 *
 * The server always decides the amount and re-checks every order with Cashfree itself, so
 * nothing here is trusted on the browser's word.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Cashfree's browser SDK ships no types */

/** Loads Cashfree's checkout script once. Resolves null if it can't load (offline, blocker). */
export function loadCashfreeSdk(): Promise<any | null> {
  return new Promise((resolve) => {
    const existing = (window as any).Cashfree;
    if (existing) return resolve(existing);

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve((window as any).Cashfree || null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

export interface PaymentStatusInfo {
  orderId: string;
  status: "CREATED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  isPaid: boolean;
  amount: number;
  currency: string;
  kind?: "TRAINING" | "INTERNSHIP_FEE";
  itemTitle?: string;
  application?: { id: string; status: string; internshipSlug: string } | null;
}

/**
 * Asks the server to re-check an order with Cashfree, polling briefly because the gateway can
 * take a few seconds to settle. Returns the latest status, or null if it never answered.
 * A 401 is re-thrown so the caller can send the student to sign in.
 */
export async function confirmOrderWithServer(
  orderId: string,
  attempts = 10
): Promise<PaymentStatusInfo | null> {
  let latest: PaymentStatusInfo | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await apiFetch("/payments/cashfree/verify-client", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      const res = await apiFetch<{ data: PaymentStatusInfo }>(
        `/payments/status/${encodeURIComponent(orderId)}`
      );
      latest = res.data;
      if (latest.isPaid || latest.status === "FAILED") return latest;
    } catch (err) {
      if (err instanceof ApiError && [401, 403, 404].includes(err.status)) throw err;
    }
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return latest;
}

interface FeeOrder {
  feeRequired: boolean;
  status: string;
  applicationId: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  paymentSessionId?: string;
  cashfreeEnv?: "PRODUCTION" | "SANDBOX";
  isTestMode?: boolean;
}

export type FeePaymentResult =
  /** The fee is paid and the application went to the ByteHUB team. */
  | { outcome: "paid"; orderId: string; amount: number; currency: string }
  /** The admin removed the fee in the meantime, so the application was sent for free. */
  | { outcome: "no_fee_needed" }
  /** The browser is moving to Cashfree's payment page; it comes back to our return page. */
  | { outcome: "redirecting" }
  /** The student closed the payment window or the payment didn't go through. */
  | { outcome: "not_paid"; reason?: string };

/**
 * Pays the registration fee for one of the student's applications: creates (or reuses) the
 * order on the server, opens Cashfree's checkout window and waits for the server to confirm.
 * Throws ApiError / Error for problems the caller should show (closed internship, network).
 */
export async function payInternshipFee(applicationId: string): Promise<FeePaymentResult> {
  const res = await apiFetch<{ data: FeeOrder }>("/payments/internship-fee", {
    method: "POST",
    body: JSON.stringify({ applicationId }),
  });
  const order = res.data;

  if (!order.feeRequired) return { outcome: "no_fee_needed" };
  if (!order.orderId) {
    throw new Error("The payment could not be started. Please try again.");
  }

  const paid = (status: PaymentStatusInfo | null): FeePaymentResult =>
    status?.isPaid
      ? {
          outcome: "paid",
          orderId: status.orderId,
          amount: status.amount,
          currency: status.currency,
        }
      : { outcome: "not_paid" };

  if (order.status === "PAID") {
    return paid(await confirmOrderWithServer(order.orderId, 3));
  }

  // Local development without gateway keys: the API runs a labelled test mode and confirms
  // the order itself. This branch cannot occur against a production API.
  if (order.isTestMode) {
    return paid(await confirmOrderWithServer(order.orderId, 3));
  }

  if (!order.paymentSessionId) {
    throw new Error(
      "The payment gateway did not return a checkout session. Please retry."
    );
  }
  const Cashfree = await loadCashfreeSdk();
  if (!Cashfree) {
    throw new Error(
      "The secure payment window could not be loaded. Check your connection or turn off any content blocker, then retry."
    );
  }
  const result = await openCashfreeCheckout(
    Cashfree,
    order.paymentSessionId,
    order.cashfreeEnv
  );
  if (result.redirecting) return { outcome: "redirecting" };

  // Whatever the gateway reports, the server has the final say.
  const status = await confirmOrderWithServer(order.orderId);
  if (status?.isPaid) return paid(status);
  return { outcome: "not_paid", reason: result.error };
}

/**
 * Sends the student to Cashfree's own payment page in the same tab. Cashfree brings them back
 * to the order's return page (/payments/return or /training/checkout/return), which confirms
 * the payment with our server. Card and bank verification happen on Cashfree's page, which
 * works on every phone and is never stopped by pop-up blockers.
 */
export async function openCashfreeCheckout(
  Cashfree: any,
  paymentSessionId: string,
  cashfreeEnv?: "PRODUCTION" | "SANDBOX"
): Promise<{ redirecting: boolean; error?: string }> {
  const cashfree = Cashfree({
    mode: cashfreeEnv === "PRODUCTION" ? "production" : "sandbox",
  });
  // The second argument (false) turns off Cashfree's "quick pay" sheet, which the script
  // otherwise shows inside our page on screens narrower than 768px. In that sheet, card and
  // netbanking need pop-up windows and forms sent from our page to the bank, which phone
  // browsers block. With it off, phones get Cashfree's full page, the same as laptops. The
  // script passes the same value itself when quick pay doesn't apply.
  const result = await cashfree.checkout(
    { paymentSessionId, redirectTarget: "_self" },
    false
  );
  if (result?.error) {
    return {
      redirecting: false,
      error: result.error.message || "Payment could not start",
    };
  }
  return { redirecting: Boolean(result?.redirect) };
}
