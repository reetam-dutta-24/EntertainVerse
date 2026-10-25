/**
 * Opt the seeded demo users into AI Match (with coarse demo locations) so the
 * matcher has people to group. Admin accounts are never opted in.
 *
 *   npx tsx --conditions=react-server scripts/seed-match-demo.ts
 */
import { prisma } from "@/lib/prisma";

const CITIES = [
  { latitude: 30.3, longitude: 76.4, country: "IN" }, // Patiala
  { latitude: 28.6, longitude: 77.2, country: "IN" }, // Delhi
  { latitude: 30.7, longitude: 76.8, country: "IN" }, // Chandigarh
  { latitude: 19.1, longitude: 72.9, country: "IN" }, // Mumbai
  { latitude: 12.9, longitude: 77.6, country: "IN" }, // Bengaluru
  { latitude: 35.7, longitude: 139.7, country: "JP" }, // Tokyo
  { latitude: 37.6, longitude: 127.0, country: "KR" }, // Seoul
  { latitude: 40.7, longitude: -74.0, country: "US" }, // New York
];

const INTROS = [
  "Weekend anime binger, always hunting for the next Death Note.",
  "K-drama marathons and K-pop on repeat.",
  "Thrillers, heists and anything with a twist ending.",
  "Lo-fi playlists while coding, Ghibli on Sundays.",
  "Shounen fan — the more training arcs the better.",
  "Documentaries and slow, atmospheric shows.",
  "Here for the soundtracks as much as the shows.",
  "Movie nights with friends, popcorn mandatory.",
];

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "USER", email: { not: { endsWith: "@example.invalid" } } },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  let count = 0;
  for (const [index, user] of users.entries()) {
    const city = CITIES[index % CITIES.length]!;
    await prisma.matchProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, scope: "world", groupSize: 4, intro: INTROS[index % INTROS.length], ...city },
      update: {},
    });
    count++;
  }
  console.log(`Opted ${count} demo users into AI Match (existing settings were left alone).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
