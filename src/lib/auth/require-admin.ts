import { notFound } from "next/navigation";
import { requireUser } from "./require-user";

export async function requireAdmin(nextPath?: string) {
  const { authUser, profile } = await requireUser(nextPath);
  if (profile.role !== "admin" && profile.role !== "editor") {
    notFound();
  }
  return { authUser, profile };
}
