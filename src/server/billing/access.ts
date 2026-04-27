import { prisma } from "@/server/db/client";
import { getUserAccessibleContentIds } from "./subscription";

/**
 * Determine whether a user can access a specific content item.
 *
 * Access is granted if any of the following holds:
 *  - the content is marked free (`isFree=true`)
 *  - the user has paid for it as a one-shot purchase (ContentPurchase.paid)
 *  - the user has an active subscription on a Plan that includes the content
 *
 * Used by the stream API and the watch page (Block 5).
 */
export async function userCanAccessContent(
  userId: string | null,
  contentItemId: string,
): Promise<boolean> {
  const item = await prisma.contentItem.findUnique({
    where: { id: contentItemId },
    select: { isFree: true },
  });
  if (!item) return false;
  if (item.isFree) return true;
  if (!userId) return false;

  const purchase = await prisma.contentPurchase.findFirst({
    where: { userId, contentItemId, status: "paid" },
    select: { id: true },
  });
  if (purchase) return true;

  const accessible = await getUserAccessibleContentIds(userId);
  return accessible.has(contentItemId);
}
