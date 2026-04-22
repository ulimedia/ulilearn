import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display text-6xl">404</p>
        <p className="mt-4 text-paper-300">La pagina che cerchi non esiste.</p>
        <Link href={ROUTES.catalog} className="mt-6 inline-block text-accent hover:underline">
          Torna al catalogo
        </Link>
      </div>
    </div>
  );
}
