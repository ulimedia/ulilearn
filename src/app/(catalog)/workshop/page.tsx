import type { Metadata } from "next";
import { TypeListingPage } from "@/components/catalog/TypeListingPage";

export const metadata: Metadata = {
  title: "Workshop",
  description:
    "Incontri in presenza, posti limitati. Acquistabili singolarmente, sconto fisso per gli abbonati.",
};

export const revalidate = 600;

export default function WorkshopPage() {
  return <TypeListingPage type="workshop" />;
}
