import type { Metadata } from "next";
import { TypeListingPage } from "@/components/catalog/TypeListingPage";

export const metadata: Metadata = {
  title: "Documentari",
  description:
    "Sguardi lunghi su autori e movimenti della fotografia contemporanea.",
};

export const revalidate = 600;

export default function DocumentariPage() {
  return <TypeListingPage type="documentario" />;
}
