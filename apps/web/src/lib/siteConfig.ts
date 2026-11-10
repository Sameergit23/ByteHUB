/**
 * Business and legal details shown across the site (footers, contact page, legal pages).
 *
 * BEFORE LAUNCH: replace every value marked PLACEHOLDER with your real details, have the
 * legal pages reviewed, then set `legal.reviewed` to true. Until then the Terms, Privacy and
 * Refund pages show a visible "draft" notice. Payment gateways (Cashfree) check these pages
 * and the contact details when activating live payments.
 */
export const siteConfig = {
  brandName: "ByteHUB",

  /** Public site address used in the legal pages. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://bytehubnet.com",

  contact: {
    // PLACEHOLDER — use mailboxes on your real domain.
    generalEmail: "support@bytehubnet.com",
    admissionsEmail: "support@bytehubnet.com",
    partnershipsEmail: "support@bytehubnet.com",
    supportEmail: "support@bytehubnet.com",
    // PLACEHOLDER — a number you actually answer. Shown in footers.
    phone: "7366937682",
    // PLACEHOLDER
    city: "Indore, India",
    officeName: "ByteHUB Learning Labs",
    officeAddress: "Vijay Nagar, Indore, Madhyapradesh 452020, India",
    hours: "Monday – Friday, 09:00 – 18:00 IST",
  },

  legal: {
    /** Set to true once a lawyer has reviewed the Terms, Privacy and Refund pages. */
    reviewed: false,
    // PLACEHOLDER — the registered business that receives payments.
    legalEntityName: "Sameer Akhtar",
    registeredAddress: "Vijay Nagar, Indore, Madhyapradesh 452020, India",
    // PLACEHOLDER — date the current version of the policies takes effect.
    effectiveDate: "10 November 2026",
    /** Courts for disputes (Terms, "Governing law"). */
    jurisdictionCity: "Indore, Madhyapradesh",
    /**
     * Grievance Officer — required under India's IT Rules 2011 and the DPDP Act 2023.
     * PLACEHOLDER
     */
    grievanceOfficer: {
      name: "Sameer Akhtar",
      email: "support@bytehubnet.com",
    },
    /** Optional: shown on the Terms page and invoices when you are GST registered. */
    gstin: "",
  },

  /**
   * Refund rules for paid training programmes. These numbers appear on the Refund Policy and
   * should match how you actually process refunds in the admin panel.
   */
  refunds: {
    /** Full refund if the request arrives at least this many days before the cohort starts. */
    fullRefundDaysBeforeStart: 7,
    /** Partial refund window: from that point until this many days after the start date. */
    partialRefundDaysAfterStart: 7,
    /** Percentage refunded inside the partial window. */
    partialRefundPercent: 50,
    /** Business days for the money to be sent back after approval. */
    processingBusinessDays: "5–7",
  },
} as const;

export type SiteConfig = typeof siteConfig;
