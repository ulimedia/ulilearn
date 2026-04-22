import type { Metadata } from "next";
import { TypeListingPage } from "@/components/catalog/TypeListingPage";

export const metadata: Metadata = {
  title: "Corsi",
  description:
    "Percorsi strutturati in moduli e lezioni. Per chi vuole formarsi davvero in fotografia.",
};

export const revalidate = 600;

export default function CorsiPage() {
  return <TypeListingPage type="corso" />;
}
