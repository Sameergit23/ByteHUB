import React from "react";

export interface JobPostingData {
  title: string;
  description: string;
  datePosted: string;
  validThrough: string;
  employmentType: "INTERN" | "FULL_TIME" | "PART_TIME" | "CONTRACTOR";
  hiringOrganization: {
    name: string;
    sameAs?: string;
  };
  jobLocation: {
    addressLocality: string;
    addressCountry: string;
  };
  baseSalary?: {
    currency: string;
    value: number;
    unitText: "MONTH" | "HOUR" | "YEAR";
  };
}

export const JobPostingJsonLd: React.FC<{ job: JobPostingData }> = ({ job }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: job.hiringOrganization.name,
      sameAs: job.hiringOrganization.sameAs,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.jobLocation.addressLocality,
        addressCountry: job.jobLocation.addressCountry,
      },
    },
    baseSalary: job.baseSalary
      ? {
          "@type": "MonetaryAmount",
          currency: job.baseSalary.currency,
          value: {
            "@type": "QuantitativeValue",
            value: job.baseSalary.value,
            unitText: job.baseSalary.unitText,
          },
        }
      : undefined,
  };

  // Secure JSON serialization against script breakout XSS: replace '<' with unicode escape
  const safeJsonString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonString }}
    />
  );
};

