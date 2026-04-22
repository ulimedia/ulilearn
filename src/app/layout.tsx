import type { Metadata, Viewport } from "next";
import { Oswald, Open_Sans } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/provider";
import { PlausibleScript } from "@/lib/analytics/plausible";
import { ToastProvider } from "@/components/ui/toast";
import { APP_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description:
    "Piattaforma di formazione avanzata in fotografia contemporanea. Lecture, corsi, documentari.",
  openGraph: {
    siteName: APP_NAME,
    locale: "it_IT",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${oswald.variable} ${openSans.variable}`}>
      <body className="min-h-screen bg-ink-900 font-sans text-paper-50 antialiased">
        <TRPCProvider>{children}</TRPCProvider>
        <ToastProvider />
        <PlausibleScript />
      </body>
    </html>
  );
}
