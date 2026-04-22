import type { Metadata } from "next";
import { TypeListingPage } from "@/components/catalog/TypeListingPage";

export const metadata: Metadata = {
  title: "Masterclass",
  description:
    "Sessioni intensive con un singolo autore. Acquistabili singolarmente, sconto fisso per gli abbonati.",
};

export const revalidate = 600;

export default function MasterclassPage() {
  return <TypeListingPage type="masterclass" />;
}
