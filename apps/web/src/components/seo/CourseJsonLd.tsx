import React from "react";

export interface CourseData {
  name: string;
  description: string;
  provider: {
    name: string;
    sameAs?: string;
  };
  courseCode?: string;
  hasCourseInstance?: {
    courseMode: "online" | "onsite" | "blended";
    duration: string;
    startDate: string;
  };
  offers?: {
    price: number;
    priceCurrency: string;
    availability?: string;
  };
}

export const CourseJsonLd: React.FC<{ course: CourseData }> = ({ course }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    description: course.description,
    provider: {
      "@type": "Organization",
      name: course.provider.name,
      sameAs: course.provider.sameAs,
    },
    courseCode: course.courseCode,
    hasCourseInstance: course.hasCourseInstance
      ? {
          "@type": "CourseInstance",
          courseMode: course.hasCourseInstance.courseMode,
          duration: course.hasCourseInstance.duration,
          startDate: course.hasCourseInstance.startDate,
        }
      : undefined,
    offers: course.offers
      ? {
          "@type": "Offer",
          price: course.offers.price,
          priceCurrency: course.offers.priceCurrency,
          availability: course.offers.availability || "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};

