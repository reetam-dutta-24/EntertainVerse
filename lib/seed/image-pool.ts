/** Curated HD Unsplash images — neon / cyber / cinematic ambience for EntertainVerse. */
const BASE = "https://images.unsplash.com";

export const POSTER_IMAGES = [
  `${BASE}/photo-1614850523459-c2f4c699c52e?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1557683316-973673baf926?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1578632767115-351597cf2477?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1518709268805-4e9042af2178?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1620641788421-a456a7f63d98?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1550745165-9bc0b252726f?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1535016120720-40ccc68602ec?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1618005182384-a83a8bd57fbe?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1614850715214-8f53b79a36d4?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1639765480934-9b9de610b1bc?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1614728263962-45936db5fd0c?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1509248197812-2a9f38237133?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1498050108023-c5249f4df085?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1451187580459-43490279c0fa?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1526374965328-7f61d4dc18c5?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1504639725590-34d0984388bd?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1489599849927-2ee91cede3ba?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1478720568477-152d9b8e9a8c?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1440404653325-ab127d49abc1?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1419242902214-272b3f66ee7a?w=800&h=1200&fit=crop&q=85`,
  `${BASE}/photo-1506905925346-21bda4d32df4?w=800&h=1200&fit=crop&q=85`,
] as const;

export const BACKDROP_IMAGES = [
  `${BASE}/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1535016120720-40ccc68602ec?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1578632767115-351597cf2477?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1614850523459-c2f4c699c52e?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1620641788421-a456a7f63d98?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1518709268805-4e9042af2178?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1639765480934-9b9de610b1bc?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1504639725590-34d0984388bd?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1478720568477-152d9b8e9a8c?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1419242902214-272b3f66ee7a?w=1920&h=1080&fit=crop&q=85`,
  `${BASE}/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop&q=85`,
] as const;

export const AVATAR_IMAGES = [
  `${BASE}/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=85`,
  `${BASE}/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&q=85`,
] as const;

export function posterImage(index: number): string {
  return POSTER_IMAGES[index % POSTER_IMAGES.length]!;
}

export function backdropImage(index: number): string {
  return BACKDROP_IMAGES[index % BACKDROP_IMAGES.length]!;
}

export function avatarImage(index: number): string {
  return AVATAR_IMAGES[index % AVATAR_IMAGES.length]!;
}
