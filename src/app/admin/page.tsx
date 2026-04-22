import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard admin",
  robots: { index: false },
};

export default function AdminDashboard() {
  return (
    <section>
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-4 text-paper-300">
        KPI, MRR/ARR, abbonati attivi, top contenuti — da popolare nello Sprint 7 (PRD §6.10).
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["MRR", "Abbonati attivi", "Churn 30gg", "Nuovi 30gg"].map((k) => (
          <div key={k} className="border border-paper-300/15 p-6">
            <p className="text-xs uppercase tracking-wide text-paper-400">{k}</p>
            <p className="mt-2 font-display text-3xl">—</p>
          </div>
        ))}
      </div>
    </section>
  );
}
