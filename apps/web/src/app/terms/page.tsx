import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "../../components/legal/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Terms of Service — ByteHUB",
  description:
    "The terms that apply when you use ByteHUB's internships and training programmes.",
};

export default function TermsPage() {
  const { legal, contact, brandName, siteUrl } = siteConfig;

  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro={
        <p>
          These terms govern your use of {brandName} at {siteUrl}, operated by{" "}
          {legal.legalEntityName} (&ldquo;{brandName}&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;). By creating an account, applying to an internship or
          enrolling in a training programme, you agree to these terms, our{" "}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>{" "}
          and our{" "}
          <Link className="underline" href="/refund-policy">
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>
      }
    >
      <LegalSection id="service" title="1. What ByteHUB provides">
        <p>
          {brandName} offers two services: a listing of internship openings posted by
          companies, and paid, cohort-based training programmes delivered by {brandName}.
        </p>
        <p>
          We review internship postings before publishing them, but each company is
          responsible for its own listing, selection process and internship terms.{" "}
          {brandName} does not guarantee an interview, an internship offer or a job,
          including after completing a training programme.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="2. Accounts and eligibility">
        <LegalList
          items={[
            "You must give accurate information and keep your password confidential. You are responsible for activity on your account.",
            "If you are under 18, you may use ByteHUB only with the consent of a parent or legal guardian, who agrees to these terms on your behalf.",
            "Accounts are for students. Companies send internship roles through our For companies page, and ByteHUB posts them.",
            "We may suspend or close accounts that break these terms, post false information, or put other users at risk.",
          ]}
        />
      </LegalSection>

      <LegalSection id="students" title="3. Applying to internships">
        <p>
          When you apply, the company that posted the role receives the details and resume
          you submit. Applications must be your own work and truthful. You can withdraw an
          application from your dashboard while it is still under consideration.
        </p>
      </LegalSection>

      <LegalSection id="companies" title="4. Posting internships">
        <LegalList
          items={[
            "Postings must describe a real opening, its stipend and its duration accurately, and comply with applicable labour and anti-discrimination laws.",
            "Candidate information may be used only to evaluate applicants for the posted role and must be handled in line with applicable data-protection law.",
            "We may decline, edit for clarity, or remove postings that are misleading or that break these terms.",
          ]}
        />
      </LegalSection>

      <LegalSection id="fees" title="5. Training programmes, fees and payment">
        <LegalList
          items={[
            <>
              Programme fees are shown in Indian Rupees (₹) on each programme page before
              you pay.
              {legal.gstin
                ? ` Fees include applicable GST (GSTIN ${legal.gstin}).`
                : " GST is not currently charged."}
            </>,
            "Payments are processed by our payment partner Cashfree Payments. ByteHUB never sees or stores your card, UPI or bank login details.",
            "A seat is held for 15 minutes while you complete payment. Your enrolment is confirmed only once the payment is verified, and you receive a receipt by email.",
            "Cancellations and refunds are governed by our Refund & Cancellation Policy.",
          ]}
        />
      </LegalSection>

      <LegalSection id="delivery" title="6. Service delivery">
        <p>
          Training programmes are delivered online in live cohorts unless a programme page
          says otherwise. Joining details are sent to your registered email before the
          cohort start date and are available in your Student Dashboard. No physical goods
          are shipped. If we must reschedule or cancel a cohort, we will offer you a place
          in another cohort or a full refund.
        </p>
      </LegalSection>

      <LegalSection id="conduct" title="7. Acceptable use">
        <LegalList
          items={[
            "Do not upload malicious files, impersonate others, harass anyone, or misuse other users' personal information.",
            "Do not attempt to access accounts, data or systems that are not yours, or interfere with the service.",
            "Do not copy, resell or redistribute programme materials without our written permission.",
          ]}
        />
      </LegalSection>

      <LegalSection id="ip" title="8. Content and intellectual property">
        <p>
          Programme materials, the {brandName} name and this website belong to {brandName}{" "}
          or its licensors. You keep ownership of the work you submit, and give us
          permission to store and share it as needed to run the service (for example,
          sending your application to the company you applied to).
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Disclaimers and liability">
        <p>
          The service is provided on an &ldquo;as is&rdquo; basis. To the extent permitted
          by law, {brandName} is not liable for indirect or consequential losses, and our
          total liability for any claim relating to a paid programme is limited to the
          fees you paid for that programme. Nothing in these terms limits rights you have
          under the Consumer Protection Act, 2019 that cannot be excluded.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="10. Closing your account">
        <p>
          You can delete your account at any time from your dashboard. We may suspend
          access for serious or repeated breaches of these terms. Sections that by their
          nature should continue (fees already due, intellectual property, liability)
          survive closure.
        </p>
      </LegalSection>

      <LegalSection id="law" title="11. Governing law and disputes">
        <p>
          These terms are governed by the laws of India. Please contact us first so we can
          try to resolve any concern. Unresolved disputes are subject to the exclusive
          jurisdiction of the courts at {legal.jurisdictionCity}.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to these terms">
        <p>
          We may update these terms. We will post the new version here with a new
          effective date and, for significant changes, notify registered users by email.
          Continuing to use the service after a change means you accept the updated terms.
        </p>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
