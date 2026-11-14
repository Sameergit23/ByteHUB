import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogUnavailableError, getInternship } from "../../../lib/catalog";
import { CatalogWaking } from "../../../components/ui/CatalogWaking";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = {
  title: "Apply — ByteHUB",
  robots: { index: false },
};

export default async function ApplicationFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let internship;
  try {
    internship = await getInternship((await params).id);
  } catch (err) {
    if (err instanceof CatalogUnavailableError) {
      return (
        <CatalogWaking
          what="application form"
          backHref="/internships"
          backLabel="All internships"
        />
      );
    }
    throw err;
  }

  if (!internship) {
    return notFound();
  }

  return <ApplyForm internship={internship} />;
}
