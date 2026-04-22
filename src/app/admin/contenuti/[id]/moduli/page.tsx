import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/server/db/client";
import { ROUTES } from "@/lib/constants";
import { ModulesEditor } from "@/components/admin/content/ModulesEditor";

export const metadata: Metadata = {
  title: "Moduli corso",
  robots: { index: false },
};

export default async function ModulesPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const course = await prisma.contentItem.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });
  if (!course) notFound();
  if (course.type !== "corso") {
    redirect(ROUTES.admin.contentEdit(params.id));
  }

  return (
    <section>
      <Link
        href={ROUTES.admin.contentEdit(course.id)}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← {course.title}
      </Link>
      <h1 className="mt-4 font-display text-3xl">Moduli e lezioni</h1>
      <p className="mt-2 text-sm text-paper-400">
        Trascina per riordinare. I campi si salvano automaticamente.
      </p>
      <div className="mt-8">
        <ModulesEditor
          courseId={course.id}
          initialModules={course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            orderIndex: m.orderIndex,
            lessons: m.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              vimeoVideoId: l.vimeoVideoId,
              durationSeconds: l.durationSeconds,
              orderIndex: l.orderIndex,
            })),
          }))}
        />
      </div>
    </section>
  );
}
