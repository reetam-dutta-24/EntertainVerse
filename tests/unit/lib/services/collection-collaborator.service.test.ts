import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../helpers/prisma-mock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../helpers/prisma-mock")).createPrismaMock() }));

const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { addCollectionCollaborator, CollaboratorForbiddenError, CollaboratorNotFoundError, listCollectionCollaborators } = await import(
  "@/lib/services/collection-collaborator.service"
);

const OWNER = "owner-1";
const friend = { id: "user-2", name: "Mika", handle: "mika", avatarColor: "violet", avatarUrl: null };

beforeEach(() => {
  prisma.collection.findUnique.mockResolvedValue({ id: "col-1", userId: OWNER });
  prisma.user.findUnique.mockResolvedValue(friend);
  prisma.collectionCollaborator.findUnique.mockResolvedValue(null);
});

describe("addCollectionCollaborator", () => {
  it("adds the user as an editor", async () => {
    const result = await addCollectionCollaborator(OWNER, "cozy-picks", "mika");

    expect(prisma.collectionCollaborator.create).toHaveBeenCalledWith({
      data: { collectionId: "col-1", userId: "user-2", role: "editor" },
    });
    expect(result).toEqual({
      added: true,
      collaborator: { id: "user-2", name: "Mika", handle: "mika", avatarColor: "violet", avatarUrl: undefined },
    });
  });

  it("only lets the owner add collaborators", async () => {
    const attempt = addCollectionCollaborator("someone-else", "cozy-picks", "mika");
    await expect(attempt).rejects.toBeInstanceOf(CollaboratorForbiddenError);
    await expect(attempt).rejects.toThrow("Only the collection owner can manage collaborators.");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.collectionCollaborator.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown collection", async () => {
    prisma.collection.findUnique.mockResolvedValue(null);
    await expect(addCollectionCollaborator(OWNER, "missing", "mika")).rejects.toThrow(new CollaboratorNotFoundError("Collection not found."));
  });

  it("rejects an unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(addCollectionCollaborator(OWNER, "cozy-picks", "nobody")).rejects.toThrow(new CollaboratorNotFoundError("User not found."));
    expect(prisma.collectionCollaborator.create).not.toHaveBeenCalled();
  });

  it("doesn't let the owner add themself", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...friend, id: OWNER });
    await expect(addCollectionCollaborator(OWNER, "cozy-picks", "me")).rejects.toThrow(new CollaboratorForbiddenError("You are already the owner."));
    expect(prisma.collectionCollaborator.create).not.toHaveBeenCalled();
  });

  it("is idempotent for an existing collaborator", async () => {
    prisma.collectionCollaborator.findUnique.mockResolvedValue({ collectionId: "col-1", userId: "user-2", role: "editor" });
    const result = await addCollectionCollaborator(OWNER, "cozy-picks", "mika");

    expect(result.added).toBe(false);
    expect(result.collaborator.handle).toBe("mika");
    expect(prisma.collectionCollaborator.create).not.toHaveBeenCalled();
    expect(prisma.collectionCollaborator.findUnique).toHaveBeenCalledWith({
      where: { collectionId_userId: { collectionId: "col-1", userId: "user-2" } },
    });
  });

  it("looks the collection up by slug and the user by handle", async () => {
    await addCollectionCollaborator(OWNER, "cozy-picks", "mika");
    expect(prisma.collection.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "cozy-picks" } }));
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { handle: "mika" } }));
  });
});

describe("listCollectionCollaborators", () => {
  it("lists collaborators oldest first with their role", async () => {
    prisma.collectionCollaborator.findMany.mockResolvedValue([
      { role: "editor", user: friend },
      { role: "viewer", user: { id: "user-3", name: "Ren", handle: "ren", avatarColor: "teal", avatarUrl: "/uploads/ren.webp" } },
    ]);

    expect(await listCollectionCollaborators("cozy-picks")).toEqual([
      { id: "user-2", name: "Mika", handle: "mika", avatarColor: "violet", avatarUrl: undefined, role: "editor" },
      { id: "user-3", name: "Ren", handle: "ren", avatarColor: "teal", avatarUrl: "/uploads/ren.webp", role: "viewer" },
    ]);
    expect(prisma.collectionCollaborator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collectionId: "col-1" }, orderBy: { createdAt: "asc" } }),
    );
  });

  it("is empty for an unknown collection", async () => {
    prisma.collection.findUnique.mockResolvedValue(null);
    expect(await listCollectionCollaborators("missing")).toEqual([]);
    expect(prisma.collectionCollaborator.findMany).not.toHaveBeenCalled();
  });
});
