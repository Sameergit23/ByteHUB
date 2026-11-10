import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "../../components/legal/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — ByteHUB",
  description: "When and how ByteHUB training programme fees are refunded.",
};

export default function RefundPolicyPage() {
  const { refunds, contact, brandName } = siteConfig;

  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      intro={
        <p>
          This policy applies to fees paid for {brandName} training programmes. Applying
          to an internship on {brandName} is free, so no refund applies to applications.
          This policy is part of our{" "}
          <Link className="underline" href="/terms">
            Terms of Service
          </Link>
          .
        </p>
      }
    >
      <LegalSection id="student" title="1. If you cancel">
        <LegalList
          items={[
            <>
              <strong>Full refund</strong> if you cancel at least{" "}
              {refunds.fullRefundDaysBeforeStart} days before your cohort&apos;s start
              date.
            </>,
            <>
              <strong>{refunds.partialRefundPercent}% refund</strong> if you cancel after
              that, up to {refunds.partialRefundDaysAfterStart} days after the cohort
              starts.
            </>,
            <>
              <strong>No refund</strong> after {refunds.partialRefundDaysAfterStart} days
              from the start date, or if your access was suspended for breaking our Terms
              of Service.
            </>,
          ]}
        />
        <p>
          Instead of a refund, you may ask to move to a later cohort of the same programme
          once, free of charge, if you request it before your cohort starts and a seat is
          available.
        </p>
      </LegalSection>

      <LegalSection id="us" title="2. If we cancel or reschedule">
        <p>
          If {brandName} cancels a cohort, or moves its start date by more than 14 days,
          you can choose a full refund or a seat in another cohort.
        </p>
      </LegalSection>

      <LegalSection id="failed" title="3. Failed or duplicate payments">
        <p>
          If money left your account but your enrolment was not confirmed, or you were
          charged twice, our system re-checks the order with our payment partner
          automatically. If it is not resolved within 24 hours, contact us with your order
          ID and the duplicate or unconfirmed amount will be refunded in full.
        </p>
      </LegalSection>

      <LegalSection id="how" title="4. How to request a refund">
        <p>
          Email <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a> from
          your registered email address with your order ID (shown on your receipt and in
          Payments &amp; Receipts on your dashboard) and the reason for cancelling. We
          confirm the outcome by email within 2 business days.
        </p>
      </LegalSection>

      <LegalSection id="timing" title="5. When you receive the money">
        <p>
          Approved refunds are sent back to the original payment method within{" "}
          {refunds.processingBusinessDays} business days. Your bank or card issuer may
          take a few more days to show it. We cannot refund to a different account or
          method.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
