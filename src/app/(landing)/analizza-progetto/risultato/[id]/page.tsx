import { redirect } from "next/navigation";

/**
 * Legacy public result URL. Analyses are private under /io/analisi/[id].
 * Middleware forces login if the user isn't signed in.
 */
export default function LegacyProjectResultRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/io/analisi/${params.id}`);
}
