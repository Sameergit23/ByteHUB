import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "../../components/legal/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Privacy Policy — ByteHUB",
  description:
    "What personal data ByteHUB collects, why, who it is shared with, and your rights.",
};

export default function PrivacyPage() {
  const { legal, contact, brandName } = siteConfig;

  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={
        <p>
          This policy explains how {legal.legalEntityName} (&ldquo;{brandName}&rdquo;)
          collects and uses your personal data when you use our website and services, and
          the choices and rights you have under India&apos;s Digital Personal Data
          Protection Act, 2023 and the Information Technology Act, 2000.
        </p>
      }
    >
      <LegalSection id="collect" title="1. Data we collect">
        <LegalList
          items={[
            <>
              <strong>Account details:</strong> name, email address, password (stored only
              as a secure hash), account type, and for companies the organisation name.
            </>,
            <>
              <strong>Application details:</strong> phone number, college, degree,
              graduation year, GitHub, LinkedIn and portfolio links, your resume file, and
              your written answers.
            </>,
            <>
              <strong>Enrolment and payment records:</strong> programme, cohort, amount,
              payment status, and the order and transaction references from our payment
              partner. We never receive your card number, CVV, UPI PIN or bank login.
            </>,
            <>
              <strong>Messages</strong> you send through our contact and hiring-inquiry
              forms.
            </>,
            <>
              <strong>Technical data:</strong> IP address, browser type and the time of
              key account actions (such as sign-in), kept in security logs.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="use" title="2. Why we use it">
        <LegalList
          items={[
            "To create and secure your account, and keep you signed in.",
            "To send your application to the company you applied to and show you its progress.",
            "To take payment, confirm your enrolment, issue receipts and process refunds.",
            "To send service emails: email verification, password resets, application updates, receipts and cohort information.",
            "To prevent fraud and abuse, keep audit records, and meet legal, tax and accounting obligations.",
          ]}
        />
        <p>
          We process your data on the basis of your consent and for the legitimate uses
          permitted by law, such as providing a service you asked for. We do not sell your
          personal data.
        </p>
      </LegalSection>

      <LegalSection id="share" title="3. Who we share it with">
        <LegalList
          items={[
            <>
              <strong>Companies you apply to</strong> see the application and resume you
              submit to their role.
            </>,
            <>
              <strong>Cashfree Payments</strong> processes your payments.
            </>,
            <>
              <strong>Our email provider</strong> delivers service emails on our behalf.
            </>,
            <>
              <strong>Hosting, database and error-monitoring providers</strong> that store
              or process data for us under contract.
            </>,
            <>
              <strong>Authorities</strong> when the law requires it.
            </>,
          ]}
        />
        <p>
          Some of these providers may process data outside India, with safeguards required
          by applicable law.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="4. Cookies">
        <p>
          We use essential cookies to keep you signed in securely and to protect forms
          against cross-site request forgery. These are needed for the site to work, so
          they do not require consent. We do not use advertising or analytics cookies; if
          we add optional analytics, it will only run after you agree to it.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="5. How long we keep it">
        <p>
          We keep account and application data while your account is open. Payment and
          invoice records are kept for as long as tax and accounting law requires
          (generally 8 years). Security logs are kept for a limited period. When you
          delete your account, we remove or anonymise your personal details except where
          we must keep them by law.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="6. Your rights">
        <LegalList
          items={[
            "Access a copy of your data — use “Export my data” in your Student Dashboard.",
            "Correct or update inaccurate data.",
            "Erase your data — use “Delete my account” in your Student Dashboard, or email us.",
            "Withdraw consent at any time (this does not affect processing already carried out).",
            "Nominate another person to exercise your rights in case of death or incapacity.",
            "Raise a grievance with our Grievance Officer, and if unresolved, with the Data Protection Board of India.",
          ]}
        />
      </LegalSection>

      <LegalSection id="security" title="7. Security">
        <p>
          Passwords are hashed, connections are encrypted, resumes are stored privately
          and shared only through short-lived links with people who are authorised to see
          them, and access to personal data is limited and logged. No system is perfectly
          secure; if a breach affects your data we will notify you and the authorities as
          the law requires.
        </p>
      </LegalSection>

      <LegalSection id="children" title="8. Children">
        <p>
          Users under 18 need the verifiable consent of a parent or guardian to use{" "}
          {brandName}. If you believe we hold a child&apos;s data without that consent,
          contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="grievance" title="9. Grievance Officer">
        <p>
          {legal.grievanceOfficer.name}
          <br />
          {legal.legalEntityName}, {legal.registeredAddress}
          <br />
          Email:{" "}
          <a href={`mailto:${legal.grievanceOfficer.email}`}>
            {legal.grievanceOfficer.email}
          </a>
        </p>
        <p>
          We acknowledge grievances within 24 hours and aim to resolve them within 15
          days.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes to this policy">
        <p>
          We will post any changes here with a new effective date and notify registered
          users of significant changes by email. Questions:{" "}
          <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
