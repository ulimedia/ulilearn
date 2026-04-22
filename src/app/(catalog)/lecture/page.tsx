import type { Metadata } from "next";
import { TypeListingPage } from "@/components/catalog/TypeListingPage";

export const metadata: Metadata = {
  title: "Lecture",
  description:
    "Incontri di un'ora con autori contemporanei. Disponibili on-demand per gli abbonati Ulilearn Plus.",
};

export const revalidate = 600;

export default function LecturePage() {
  return <TypeListingPage type="lecture" />;
}
