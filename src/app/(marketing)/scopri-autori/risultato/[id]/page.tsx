import { redirect } from "next/navigation";

/**
 * Legacy public result URL. Analyses are now private under /io/analisi/[id].
 * We redirect: the middleware will force login if the user isn't signed in.
 */
export default function LegacyResultRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/io/analisi/${params.id}`);
}
