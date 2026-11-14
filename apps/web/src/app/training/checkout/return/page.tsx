import type { Metadata } from "next";
import { PaymentReturn } from "../../../../components/payments/PaymentReturn";

export const metadata: Metadata = {
  title: "Payment status — ByteHUB",
  robots: { index: false },
};

/** Cashfree sends students here after paying for a training seat outside the site. */
export default function CheckoutReturnPage() {
  return <PaymentReturn />;
}
