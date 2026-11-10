import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInternship } from "../../../lib/catalog";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = {
  title: "Apply — ByteHUB",
  robots: { index: false },
};

export default async function ApplicationFormPage({
  params,
}: {
  params: { id: string };
}) {
  const internship = await getInternship(params.id);

  if (!internship) {
    return notFound();
  }

  return <ApplyForm internship={internship} />;
}
