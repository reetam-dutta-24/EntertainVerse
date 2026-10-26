import type { Prisma } from "@prisma/client";

/** Role given to people the owner adds as collaborators. */
export const COLLECTION_EDITOR_ROLE = "editor";

interface CollectionAccessRow {
  userId: string;
  visibility: string;
  collaborators: { userId: string; role: string }[];
}

/** Public collections are open to all; private ones to the owner and collaborators. */
export function canViewCollection(row: CollectionAccessRow, viewerId?: string) {
  if (row.visibility !== "PRIVATE") return true;
  if (!viewerId) return false;
  return row.userId === viewerId || row.collaborators.some((c) => c.userId === viewerId);
}

/** The owner and editors may add and remove items. Settings and deletion stay owner-only. */
export function canEditCollectionItems(row: CollectionAccessRow, viewerId?: string) {
  if (!viewerId) return false;
  return (
    row.userId === viewerId ||
    row.collaborators.some((c) => c.userId === viewerId && c.role === COLLECTION_EDITOR_ROLE)
  );
}

/** Prisma filter for collections whose items `userId` may edit. */
export function editableCollectionWhere(userId: string): Prisma.CollectionWhereInput {
  return {
    OR: [{ userId }, { collaborators: { some: { userId, role: COLLECTION_EDITOR_ROLE } } }],
  };
}
