import { prisma } from "@/lib/prisma";
import { COLLECTION_EDITOR_ROLE } from "@/lib/collection-access";

export class CollaboratorNotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "CollaboratorNotFoundError";
  }
}

export class CollaboratorForbiddenError extends Error {
  constructor(message = "Only the collection owner can manage collaborators.") {
    super(message);
    this.name = "CollaboratorForbiddenError";
  }
}

export async function addCollectionCollaborator(
  ownerId: string,
  collectionSlug: string,
  collaboratorHandle: string,
) {
  const collection = await prisma.collection.findUnique({
    where: { slug: collectionSlug },
    select: { id: true, userId: true },
  });
  if (!collection) throw new CollaboratorNotFoundError("Collection not found.");
  if (collection.userId !== ownerId) throw new CollaboratorForbiddenError();

  const user = await prisma.user.findUnique({
    where: { handle: collaboratorHandle },
    select: { id: true, name: true, handle: true, avatarColor: true, avatarUrl: true },
  });
  if (!user) throw new CollaboratorNotFoundError("User not found.");
  if (user.id === ownerId) {
    throw new CollaboratorForbiddenError("You are already the owner.");
  }

  const existing = await prisma.collectionCollaborator.findUnique({
    where: {
      collectionId_userId: {
        collectionId: collection.id,
        userId: user.id,
      },
    },
  });
  if (existing) {
    return {
      added: false,
      collaborator: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarColor: user.avatarColor,
        avatarUrl: user.avatarUrl ?? undefined,
      },
    };
  }

  await prisma.collectionCollaborator.create({
    data: {
      collectionId: collection.id,
      userId: user.id,
      role: COLLECTION_EDITOR_ROLE,
    },
  });

  return {
    added: true,
    collaborator: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl ?? undefined,
    },
  };
}

export async function listCollectionCollaborators(collectionSlug: string) {
  const collection = await prisma.collection.findUnique({
    where: { slug: collectionSlug },
    select: { id: true },
  });
  if (!collection) return [];

  const rows = await prisma.collectionCollaborator.findMany({
    where: { collectionId: collection.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    handle: row.user.handle,
    avatarColor: row.user.avatarColor,
    avatarUrl: row.user.avatarUrl ?? undefined,
    role: row.role,
  }));
}
