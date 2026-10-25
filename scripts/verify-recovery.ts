import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const reetam = await prisma.user.findUnique({
    where: { email: "reetam@entertainverse.local" },
    select: { id: true },
  });
  if (!reetam) throw new Error("no reetam");

  const [collections, commMemberships, dnEpisodes, aliceEp, heistEp, otherEp] =
    await Promise.all([
      prisma.collection.count({ where: { userId: reetam.id } }),
      prisma.communityMember.count({ where: { userId: reetam.id } }),
      prisma.contentEpisode.count({
        where: { content: { slug: "death-note" } },
      }),
      prisma.contentEpisode.count({
        where: { content: { slug: "alice-in-borderland" } },
      }),
      prisma.contentEpisode.count({
        where: { content: { slug: "money-heist" } },
      }),
      prisma.contentEpisode.count({
        where: { content: { slug: { notIn: ["death-note", "alice-in-borderland", "money-heist"] } } },
      }),
    ]);

  console.log(JSON.stringify({ collections, commMemberships, dnEpisodes, aliceEp, heistEp, otherEp }, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
