import type {
  AccentColor,
  ArtistGenre,
  CatalogLanguage,
  ContentGenre,
  SongGenre,
} from "@/lib/catalog-enums";
import { roundRating } from "@/lib/format-rating";
import type {
  ArtistSeed,
  CatalogReviewSeed,
  ContentSeedBase,
  MusicSeed,
} from "./helpers";
import { artistImageUrl } from "./artist-images";
import { songImageUrl } from "./song-images";
import { generateCuratedContentItems } from "./content-catalog";
import { generateCollectionSeeds as buildCollectionSeeds } from "./collection-seeds";
import { GLOBAL_COMMUNITY_SEEDS } from "./global-seeds";

const ACCENTS: AccentColor[] = [
  "pink",
  "purple",
  "cyan",
  "blue",
  "fuchsia",
  "violet",
  "teal",
  "rose",
  "indigo",
  "emerald",
];

const CONTENT_GENRES: ContentGenre[] = [
  "action",
  "drama",
  "fantasy",
  "romance",
  "thriller",
  "comedy",
  "mystery",
  "sci-fi",
  "supernatural",
  "psychological",
];

const SONG_GENRES: SongGenre[] = [
  "jpop",
  "kpop",
  "pop",
  "rock",
  "electronic",
  "ost",
  "ballad",
  "hip-hop",
  "indie",
  "rnb",
];

const ARTIST_GENRES: ArtistGenre[] = [
  "jpop",
  "kpop",
  "pop",
  "rock",
  "electronic",
  "indie",
  "ballad",
  "metal",
  "jazz",
  "classical",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length]!;
}

function catalogRating(base: number, offset: number): number {
  return roundRating(base + offset) ?? base;
}

function review(
  author: string,
  rating: number,
  body: string,
  accent?: AccentColor,
): CatalogReviewSeed {
  return {
    authorName: author,
    authorAvatarColor: "#ff00cc",
    rating: roundRating(rating) ?? rating,
    body,
    accent: accent ?? "pink",
    likeCount: 8 + (Math.floor(rating) % 40),
    headline: body.slice(0, 64),
  };
}

// ─── Title catalogs (100 total: 40 anime + 30 movie + 30 show) ───────────────

const ANIME_TITLES = [
  { title: "Jujutsu Kaisen", native: "呪術廻戦", studio: "MAPPA", author: "Gege Akutami" },
  { title: "Demon Slayer", native: "鬼滅の刃", studio: "ufotable", author: "Koyoharu Gotouge" },
  { title: "Attack on Titan", native: "進撃の巨人", studio: "Wit Studio / MAPPA", author: "Hajime Isayama" },
  { title: "Death Note", native: "デスノート", studio: "Madhouse", author: "Tsugumi Ohba" },
  { title: "Fullmetal Alchemist: Brotherhood", native: "鋼の錬金術師", studio: "Bones", author: "Hiromu Arakawa" },
  { title: "Steins;Gate", native: "シュタインズ・ゲート", studio: "White Fox", author: "5pb. / Nitroplus" },
  { title: "Hunter x Hunter", native: "ハンター×ハンター", studio: "Madhouse", author: "Yoshihiro Togashi" },
  { title: "One Piece", native: "ワンピース", studio: "Toei Animation", author: "Eiichiro Oda" },
  { title: "Naruto Shippuden", native: "ナルト 疾風伝", studio: "Pierrot", author: "Masashi Kishimoto" },
  { title: "Bleach", native: "ブリーチ", studio: "Pierrot", author: "Tite Kubo" },
  { title: "My Hero Academia", native: "僕のヒーローアカデミア", studio: "Bones", author: "Kohei Horikoshi" },
  { title: "Chainsaw Man", native: "チェンソーマン", studio: "MAPPA", author: "Tatsuki Fujimoto" },
  { title: "Spy x Family", native: "スパイファミリー", studio: "Wit Studio / CloverWorks", author: "Tatsuya Endo" },
  { title: "Frieren: Beyond Journey's End", native: "葬送のフリーレン", studio: "Madhouse", author: "Kanehito Yamada" },
  { title: "Vinland Saga", native: "ヴィンランド・サガ", studio: "Wit Studio / MAPPA", author: "Makoto Yukimura" },
  { title: "Mob Psycho 100", native: "モブサイコ100", studio: "Bones", author: "ONE" },
  { title: "Code Geass", native: "コードギアス", studio: "Sunrise", author: "Ichiro Okouchi" },
  { title: "Cowboy Bebop", native: "カウボーイビバップ", studio: "Sunrise", author: "Shinichiro Watanabe" },
  { title: "Neon Genesis Evangelion", native: "新世紀エヴァンゲリオン", studio: "Gainax", author: "Hideaki Anno" },
  { title: "Haikyu!!", native: "ハイキュー!!", studio: "Production I.G", author: "Haruichi Furudate" },
  { title: "Blue Lock", native: "ブルーロック", studio: "8bit", author: "Muneyuki Kaneshiro" },
  { title: "Solo Leveling", native: "俺だけレベルアップな件", studio: "A-1 Pictures", author: "Chugong" },
  { title: "Dandadan", native: "ダンダダン", studio: "Science SARU", author: "Yukinobu Tatsu" },
  { title: "Oshi no Ko", native: "【推しの子】", studio: "Doga Kobo", author: "Aka Akasaka" },
  { title: "Bocchi the Rock!", native: "ぼっち・ざ・ろっく！", studio: "CloverWorks", author: "Aki Hamaji" },
  { title: "Kaguya-sama: Love Is War", native: "かぐや様は告らせたい", studio: "A-1 Pictures", author: "Aka Akasaka" },
  { title: "Re:Zero", native: "Re:ゼロから始める異世界生活", studio: "White Fox", author: "Tappei Nagatsuki" },
  { title: "Violet Evergarden", native: "ヴァイオレット・エヴァーガーデン", studio: "Kyoto Animation", author: "Kana Akatsuki" },
  { title: "Made in Abyss", native: "メイドインアビス", studio: "Kinema Citrus", author: "Akihito Tsukushi" },
  { title: "Tokyo Ghoul", native: "東京喰種", studio: "Pierrot", author: "Sui Ishida" },
  { title: "Parasyte", native: "寄生獣", studio: "Madhouse", author: "Hitoshi Iwaaki" },
  { title: "Erased", native: "僕だけがいない街", studio: "A-1 Pictures", author: "Kei Sanbe" },
  { title: "March Comes in Like a Lion", native: "3月のライオン", studio: "Shaft", author: "Chica Umino" },
  { title: "Ranking of Kings", native: "王様ランキング", studio: "Wit Studio", author: "Sosuke Tokita" },
  { title: "Cyberpunk: Edgerunners", native: "サイバーパンク エッジランナーズ", studio: "Trigger", author: "CD Projekt Red" },
  { title: "Samurai Champloo", native: "サムライチャンプルー", studio: "Madhouse", author: "Shinichiro Watanabe" },
  { title: "Trigun Stampede", native: "トライガン スタンピード", studio: "Orange", author: "Yasuhiro Nightow" },
  { title: "Hell's Paradise", native: "地獄楽", studio: "MAPPA", author: "Yuji Kaku" },
  { title: "Dr. Stone", native: "Dr.STONE", studio: "TMS Entertainment", author: "Riichiro Inagaki" },
  { title: "Your Name", native: "君の名は。", studio: "CoMix Wave Films", author: "Makoto Shinkai" },
] as const;

const MOVIE_TITLES = [
  { title: "Spirited Away", native: "千と千尋の神隠し", studio: "Studio Ghibli", director: "Hayao Miyazaki" },
  { title: "Akira", native: "アキラ", studio: "Tokyo Movie Shinsha", director: "Katsuhiro Otomo" },
  { title: "Ghost in the Shell", native: "攻殻機動隊", studio: "Production I.G", director: "Mamoru Oshii" },
  { title: "Perfect Blue", native: "パーフェクトブルー", studio: "Madhouse", director: "Satoshi Kon" },
  { title: "Paprika", native: "パプリカ", studio: "Madhouse", director: "Satoshi Kon" },
  { title: "The Garden of Words", native: "言の葉の庭", studio: "CoMix Wave Films", director: "Makoto Shinkai" },
  { title: "Weathering With You", native: "天気の子", studio: "CoMix Wave Films", director: "Makoto Shinkai" },
  { title: "Suzume", native: "すずめの戸締まり", studio: "CoMix Wave Films", director: "Makoto Shinkai" },
  { title: "Belle", native: "竜とそばかすの姫", studio: "Studio Chizu", director: "Mamoru Hosoda" },
  { title: "Promare", native: "プロメア", studio: "Trigger", director: "Hiroyuki Imaishi" },
  { title: "Inception", studio: "Warner Bros.", director: "Christopher Nolan" },
  { title: "Interstellar", studio: "Paramount Pictures", director: "Christopher Nolan" },
  { title: "Blade Runner 2049", studio: "Warner Bros.", director: "Denis Villeneuve" },
  { title: "The Matrix", studio: "Warner Bros.", director: "Lana & Lilly Wachowski" },
  { title: "Dune", studio: "Legendary Pictures", director: "Denis Villeneuve" },
  { title: "Everything Everywhere All at Once", studio: "A24", director: "Daniel Kwan & Daniel Scheinert" },
  { title: "Parasite", native: "기생충", studio: "Barunson E&A", director: "Bong Joon-ho" },
  { title: "Oldboy", native: "올드보이", studio: "Show East", director: "Park Chan-wook" },
  { title: "Train to Busan", native: "부산행", studio: "Next Entertainment World", director: "Yeon Sang-ho" },
  { title: "Your Lie in April", native: "四月は君の嘘", studio: "A-1 Pictures", director: "Kyohei Ishiguro" },
  { title: "The Dark Knight", studio: "Warner Bros.", director: "Christopher Nolan" },
  { title: "Pulp Fiction", studio: "Miramax", director: "Quentin Tarantino" },
  { title: "Fight Club", studio: "20th Century Fox", director: "David Fincher" },
  { title: "Whiplash", studio: "Bold Films", director: "Damien Chazelle" },
  { title: "La La Land", studio: "Summit Entertainment", director: "Damien Chazelle" },
  { title: "Mad Max: Fury Road", studio: "Warner Bros.", director: "George Miller" },
  { title: "The Shawshank Redemption", studio: "Castle Rock Entertainment", director: "Frank Darabont" },
  { title: "Ponyo", native: "崖の上のポニョ", studio: "Studio Ghibli", director: "Hayao Miyazaki" },
  { title: "Howl's Moving Castle", native: "ハウルの動く城", studio: "Studio Ghibli", director: "Hayao Miyazaki" },
  { title: "Princess Mononoke", native: "もののけ姫", studio: "Studio Ghibli", director: "Hayao Miyazaki" },
] as const;

const SHOW_TITLES = [
  { title: "Breaking Bad", studio: "AMC", director: "Vince Gilligan", network: "AMC" },
  { title: "Stranger Things", studio: "21 Laps Entertainment", director: "The Duffer Brothers", network: "Netflix" },
  { title: "The Last of Us", studio: "HBO", director: "Craig Mazin", network: "HBO" },
  { title: "Arcane", studio: "Fortiche Production", director: "Pascal Charrue", network: "Netflix" },
  { title: "Wednesday", studio: "MGM Television", director: "Tim Burton", network: "Netflix" },
  { title: "Dark", studio: "Wiedemann & Berg", director: "Baran bo Odar", network: "Netflix" },
  { title: "Black Mirror", studio: "Zeppotron", director: "Charlie Brooker", network: "Netflix" },
  { title: "The Mandalorian", studio: "Lucasfilm", director: "Jon Favreau", network: "Disney+" },
  { title: "House of the Dragon", studio: "HBO", director: "Ryan Condal", network: "HBO" },
  { title: "The Boys", studio: "Amazon MGM Studios", director: "Eric Kripke", network: "Prime Video" },
  { title: "Severance", studio: "Red Hour Productions", director: "Ben Stiller", network: "Apple TV+" },
  { title: "Fallout", studio: "Kilter Films", director: "Jonathan Nolan", network: "Prime Video" },
  { title: "Shogun", studio: "FX Productions", director: "Rachel Kondo", network: "FX / Hulu" },
  { title: "True Detective", studio: "HBO", director: "Nic Pizzolatto", network: "HBO" },
  { title: "Westworld", studio: "HBO", director: "Jonathan Nolan", network: "HBO" },
  { title: "The Witcher", studio: "Platige Image", director: "Lauren Schmidt Hissrich", network: "Netflix" },
  { title: "Loki", studio: "Marvel Studios", director: "Kate Herron", network: "Disney+" },
  { title: "Andor", studio: "Lucasfilm", director: "Tony Gilroy", network: "Disney+" },
  { title: "Invincible", studio: "Skybound Entertainment", director: "Robert Kirkman", network: "Prime Video" },
  { title: "Peacemaker", studio: "DC Studios", director: "James Gunn", network: "Max" },
  { title: "The Office", studio: "Reveille Productions", director: "Greg Daniels", network: "NBC" },
  { title: "Game of Thrones", studio: "HBO", director: "David Benioff & D.B. Weiss", network: "HBO" },
  { title: "Better Call Saul", studio: "Sony Pictures Television", director: "Vince Gilligan", network: "AMC" },
  { title: "The Bear", studio: "FX Productions", director: "Christopher Storer", network: "FX / Hulu" },
  { title: "Succession", studio: "HBO", director: "Jesse Armstrong", network: "HBO" },
  { title: "Ted Lasso", studio: "Doozer Productions", director: "Jason Sudeikis", network: "Apple TV+" },
  { title: "Chernobyl", studio: "HBO", director: "Craig Mazin", network: "HBO" },
  { title: "The Crown", studio: "Left Bank Pictures", director: "Peter Morgan", network: "Netflix" },
  { title: "Mr. Robot", studio: "USA Network", director: "Sam Esmail", network: "USA Network" },
  { title: "Dexter", studio: "Showtime", director: "James Manos Jr.", network: "Showtime" },
] as const;

const ARTIST_NAMES: Array<{
  slug: string;
  title: string;
  nativeTitle?: string;
  isGroup: boolean;
  genre: ArtistGenre;
  label: string;
  debutYear: number;
  languages?: CatalogLanguage[];
  members?: { name: string; role: string }[];
}> = [
  { slug: "one-direction", title: "One Direction", isGroup: true, genre: "pop", label: "Syco / Columbia", debutYear: 2010, languages: ["english"], members: [{ name: "Harry Styles", role: "Vocalist" }, { name: "Niall Horan", role: "Vocalist" }, { name: "Louis Tomlinson", role: "Vocalist" }] },
  { slug: "bruno-mars", title: "Bruno Mars", isGroup: false, genre: "pop", label: "Atlantic Records", debutYear: 2010, languages: ["english"] },
  { slug: "shawn-mendes", title: "Shawn Mendes", isGroup: false, genre: "pop", label: "Island Records", debutYear: 2014, languages: ["english"] },
  { slug: "maroon-5", title: "Maroon 5", isGroup: true, genre: "pop", label: "222 / Interscope", debutYear: 1994, languages: ["english"], members: [{ name: "Adam Levine", role: "Vocalist" }, { name: "James Valentine", role: "Guitar" }] },
  { slug: "oneokrock", title: "ONE OK ROCK", isGroup: true, genre: "rock", label: "Fueled by Ramen", debutYear: 2007, members: [{ name: "Taka", role: "Vocalist" }, { name: "Toru", role: "Guitar" }] },
  { slug: "blackpink", title: "BLACKPINK", isGroup: true, genre: "kpop", label: "YG Entertainment", debutYear: 2016, members: [{ name: "Jennie", role: "Rapper" }, { name: "Lisa", role: "Dancer" }, { name: "Rosé", role: "Vocalist" }] },
  { slug: "bts", title: "BTS", nativeTitle: "방탄소년단", isGroup: true, genre: "kpop", label: "HYBE", debutYear: 2013, members: [{ name: "RM", role: "Leader" }, { name: "Jungkook", role: "Vocalist" }, { name: "Jimin", role: "Vocalist" }] },
  { slug: "newjeans", title: "NewJeans", isGroup: true, genre: "kpop", label: "ADOR", debutYear: 2022, members: [{ name: "Minji", role: "Vocalist" }, { name: "Hanni", role: "Vocalist" }, { name: "Haerin", role: "Vocalist" }] },
  { slug: "eminem", title: "Eminem", isGroup: false, genre: "hip-hop", label: "Shady Records", debutYear: 1999, languages: ["english"] },
  { slug: "the-chainsmokers", title: "The Chainsmokers", isGroup: true, genre: "electronic", label: "Disruptor Records", debutYear: 2012, languages: ["english"], members: [{ name: "Andrew Taggart", role: "DJ / Vocalist" }, { name: "Alex Pall", role: "DJ" }] },
  { slug: "coldplay", title: "Coldplay", isGroup: true, genre: "rock", label: "Parlophone", debutYear: 1998, languages: ["english"], members: [{ name: "Chris Martin", role: "Vocalist" }, { name: "Jonny Buckland", role: "Guitar" }, { name: "Guy Berryman", role: "Bass" }, { name: "Will Champion", role: "Drums" }] },
  { slug: "arijit-singh", title: "Arijit Singh", nativeTitle: "अरिजीत सिंह", isGroup: false, genre: "ballad", label: "T-Series", debutYear: 2011, languages: ["hindi", "english"] },
  { slug: "the-weeknd", title: "The Weeknd", isGroup: false, genre: "rnb", label: "XO / Republic Records", debutYear: 2010, languages: ["english"] },
  { slug: "charlie-puth", title: "Charlie Puth", isGroup: false, genre: "pop", label: "Atlantic Records", debutYear: 2015, languages: ["english"] },
  { slug: "justin-bieber", title: "Justin Bieber", isGroup: false, genre: "pop", label: "Def Jam / RBMG", debutYear: 2009, languages: ["english"] },
  { slug: "twice", title: "TWICE", isGroup: true, genre: "kpop", label: "JYP Entertainment", debutYear: 2015, members: [{ name: "Nayeon", role: "Vocalist" }, { name: "Momo", role: "Dancer" }, { name: "Sana", role: "Vocalist" }] },
];

const USER_PROFILES = [
  { name: "Reetam Dutta", handle: "reetam_dutta", email: "reetam@entertainverse.local", location: "Kolkata, India", bio: "Building taste profiles and binge-watching everything neon. I collect OSTs, debate rankings in communities, and keep my watchlist ruthlessly organised. Always looking for the next series that blends spectacle with real emotional weight." },
  { name: "Aisha Khan", handle: "aisha_khan", email: "aisha@entertainverse.local", location: "Mumbai, India", bio: "J-pop devotee. Frieren evangelist. Always listening to RADWIMPS. I host watch parties, curate music collections, and chase opening themes with the same energy most people reserve for season finales." },
  { name: "Vikram Patel", handle: "vikram_patel", email: "vikram@entertainverse.local", location: "Bangalore, India", bio: "K-pop curator and community watch party host. I split time between chart-topping singles, anime OST deep-dives, and building public collections other fans can actually use. If it has a great hook and a story behind it, I have probably already saved it." },
] as const;

export interface UserSeed {
  email: string;
  password: string;
  name: string;
  handle: string;
  avatarColor: string;
  bio: string;
  location: string;
  aiTasteScore: number;
}

export interface CommunitySeed {
  slug: string;
  name: string;
  category: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  activityLevel: string;
  accent: AccentColor;
  posts: Array<{
    authorEmail: string;
    title: string;
    content: string;
    kind?: "POST" | "ANNOUNCEMENT";
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }>;
}

export interface CollectionSeed {
  slug: string;
  ownerEmail: string;
  name: string;
  description: string;
  category: string;
  genreLabels: string[];
  kind: "content" | "music";
  visibility: "PUBLIC" | "PRIVATE";
  accent: AccentColor;
  favoriteCount: number;
  items?: string[];
  tracks?: string[];
}

const VOICE_ACTORS = [
  "Yuki Kaji", "Natsuki Hanae", "Mamoru Miyano", "Maaya Sakamoto", "Hiroshi Kamiya",
  "Rie Takahashi", "Jun Fukuyama", "Saori Hayami", "Kana Hanazawa", "Daisuke Ono",
];

const COMPOSERS = [
  "Yuki Kajiura", "Hiroyuki Sawano", "Joe Hisaishi", "Kevin Kiner", "Ludwig Göransson",
  "Hans Zimmer", "Ramin Djawadi", "Bear McCreary", "Yoko Kanno", "Kenji Kawai",
];

function buildContentItem(
  entry: { title: string; native?: string; studio?: string; director?: string; author?: string; network?: string },
  type: "anime" | "show" | "movie",
  index: number,
): ContentSeedBase {
  const slug = slugify(entry.title);
  const accent = pick(ACCENTS, index);
  const genreA = pick(CONTENT_GENRES, index);
  const genreB = pick(CONTENT_GENRES, index + 3);
  const year = 1998 + (index % 28);
  const isMovie = type === "movie";
  const seasons = isMovie ? undefined : 1 + (index % 3);
  const episodes = isMovie ? undefined : 12 + (index % 13);

  const lang: CatalogLanguage =
    type === "show" || (type === "movie" && !entry.native) ? "english" : "japanese";

  const studio = entry.studio ?? pick(["MAPPA", "ufotable", "Madhouse", "Bones", "Netflix"], index);
  const director = entry.director ?? pick(["Sunghoo Park", "Christopher Nolan", "Bong Joon-ho", "Makoto Shinkai", "Denis Villeneuve"], index);
  const network = entry.network ?? (type === "show" ? pick(["Netflix", "HBO", "Crunchyroll", "Disney+"], index) : type === "anime" ? "TV Tokyo" : undefined);

  return {
    slug,
    title: entry.title,
    nativeTitle: entry.native,
    type,
    accent,
    genreLabels: [genreA, genreB, pick(CONTENT_GENRES, index + 7)],
    languages: type === "anime" ? [lang, "english"] : [lang],
    rating: catalogRating(7.2, (index % 23) * 0.1),
    year,
    meta: isMovie ? "Feature Film" : `${seasons} Season${seasons === 1 ? "" : "s"}, ${episodes} Episodes`,
    seasonCount: seasons,
    episodeCount: episodes,
    seasonLabel: seasons ? "Season 1" : undefined,
    studio,
    director,
    composer: pick(COMPOSERS, index),
    originalAuthor: entry.author ?? (type === "anime" ? pick(["Gege Akutami", "Hajime Isayama", "Eiichiro Oda"], index) : undefined),
    sourceMaterial: type === "anime" ? pick(["Manga", "Light Novel", "Original"], index) : type === "show" ? "Original Screenplay" : "Original",
    producers: pick(["Aniplex", "KADOKAWA", "Netflix", "HBO", "A24"], index),
    network,
    country: type === "anime" ? "Japan" : type === "show" ? pick(["USA", "UK", "South Korea"], index) : pick(["Japan", "USA", "South Korea"], index),
    status: index % 4 === 0 ? "Ongoing" : "Completed",
    ageRating: index % 5 === 0 ? "18+" : "16+",
    imdbRating: catalogRating(7, (index % 20) * 0.1),
    malScore: type === "anime" ? catalogRating(7.5, (index % 15) * 0.1) : undefined,
    airedFrom: `Oct ${year}`,
    airedTo: index % 4 === 0 ? "Present" : `Dec ${year + (seasons ?? 0)}`,
    broadcast: type === "anime" ? "Fridays 11:00 PM JST" : type === "show" ? pick(["Sundays 9:00 PM EST", "Wednesdays 8:00 PM PST"], index) : undefined,
    airingDay: type !== "movie" ? pick(["Friday", "Sunday", "Wednesday"], index) : undefined,
    episodeDuration: isMovie ? "2h 15m" : "24 Min",
    lastUpdate: `Jul ${year + 1}`,
    highlightTags: [pick(CONTENT_GENRES, index), isMovie ? "Feature Film" : `${episodes} Episodes`, "Fan Favorite"],
    trendingLabel: `Trending Globally At #${(index % 9) + 1} in ${type === "anime" ? "Anime" : type === "movie" ? "Movies" : "Shows"}`,
    creditLabel: `${studio} · ${director}`,
    description: `${entry.title} is a ${type} experience curated for EntertainVerse — rich characters, layered storytelling, and unforgettable world-building. Every scene pushes the ${genreA} and ${genreB} threads forward with purpose, whether you are discovering it for the first time or revisiting a favourite moment. Fans praise its pacing, emotional weight, and the way it rewards close attention without ever feeling slow.`,
    synopsis: `In ${entry.title}, worlds collide under electric skies. Follow unforgettable characters through ${pick(["betrayal", "redemption", "discovery", "war", "love"], index)} as the narrative unfolds across ${isMovie ? "one breathtaking film" : `${episodes ?? 12} episodes`}. A must-watch for fans of ${genreA} and ${genreB}. The story builds tension with precision, lands its biggest turns with confidence, and leaves room for debate long after the credits roll. On EntertainVerse, this title is a cornerstone pick for anyone building a serious watchlist.`,
  };
}

export function generateContentItems(): ContentSeedBase[] {
  return generateCuratedContentItems();
}

function artistLanguages(artist: (typeof ARTIST_NAMES)[number]): CatalogLanguage[] {
  if (artist.languages?.length) return artist.languages;
  if (artist.genre === "kpop") return ["korean", "english"];
  if (artist.genre === "jpop") return ["japanese", "english"];
  return ["english"];
}

function enrichArtistSynopsis(
  artist: (typeof ARTIST_NAMES)[number],
  genre: ArtistGenre,
): string {
  const lead = `${artist.title} defines the ${genre} soundscape on EntertainVerse — from arena anthems to intimate ballads, their catalog shapes how fans discover music and anime OSTs alike. ${
    artist.isGroup
      ? "As a group, their chemistry on stage and in the studio translates into performances that feel both polished and personal."
      : "Their solo work balances mainstream appeal with artistic depth, making every release feel like an event."
  }`;

  const labelLine = artist.label
    ? `${artist.title} records under ${artist.label}`
    : `${artist.title} has built a major catalog`;

  const debutLine = artist.debutYear
    ? `${labelLine} and debuted in ${artist.debutYear}, growing into one of the most streamed names in ${genre.toUpperCase()}.`
    : `${labelLine}, growing into one of the most streamed names in ${genre.toUpperCase()}.`;

  const catalogLine = artist.isGroup
    ? `Known for choreography-forward singles, fan-driven comebacks, and global tours, ${artist.title} remains a cornerstone artist for playlist builders and OST hunters on the platform.`
    : `Known for chart-topping singles, distinctive vocal tone, and cross-genre collaborations, ${artist.title} remains a cornerstone artist for playlist builders and OST hunters on the platform.`;

  return [lead, debutLine, catalogLine].join(" ");
}

export function generateArtistItems(): ArtistSeed[] {
  return ARTIST_NAMES.map((artist, index) => {
    const genre = artist.genre;
    return {
    slug: artist.slug,
    title: artist.title,
    nativeTitle: artist.nativeTitle,
    accent: pick(ACCENTS, index),
    rating: catalogRating(7.8, (index % 12) * 0.1),
    rankLeft: `#${(index % 10) + 1} in ${artist.genre.toUpperCase()}`,
    rankRight: `#${(index % 5) + 1} in your favourite artist`,
    genreLabels: [artist.genre, pick(ARTIST_GENRES, index + 2)],
    languages: artistLanguages(artist),
    label: artist.label,
    debutYear: artist.debutYear,
    isGroup: artist.isGroup,
    members: artist.isGroup
      ? artist.members ?? [
          { name: `${artist.title} Member 1`, role: "Vocalist" },
          { name: `${artist.title} Member 2`, role: "Producer" },
        ]
      : undefined,
    primaryTags: [artist.genre, artist.isGroup ? "Group" : "Solo", "Trending"],
    imageUrl: artistImageUrl(artist.slug),
    synopsis: enrichArtistSynopsis(artist, genre),
    catalogReviews: [
      review("EntertainVerse Curator", catalogRating(8.5, (index % 10) * 0.1), `${artist.title} delivers consistent quality across albums and live performances. Essential listening for anyone exploring ${artist.genre} on EntertainVerse. The production is sharp, the vocal identity is unmistakable, and the discography rewards both casual playlists and deep dives.`, pick(ACCENTS, index)),
      review(pick(USER_PROFILES, index).name, catalogRating(8, index % 5), `Been on repeat all week. ${artist.title} never misses — every track feels intentional, and the emotional range keeps me coming back. Already added three songs to my collections.`, pick(ACCENTS, index + 1)),
    ],
  };
  });
}

/** Real modern tracks — 4 songs each for the featured artist catalog. */
const REAL_TRACKS: Array<{
  title: string;
  nativeTitle?: string;
  artistSlug: string;
  kind: "song" | "ost" | "album";
  contentSlug?: string;
  album?: string;
  genre: SongGenre;
  year: number;
  durationLabel: string;
  durationSeconds: number;
  lyrics?: string;
}> = [
  // One Direction
  { title: "Drag Me Down", artistSlug: "one-direction", kind: "song", genre: "pop", year: 2015, durationLabel: "3:12", durationSeconds: 192, album: "Made in the A.M." },
  { title: "What Makes You Beautiful", artistSlug: "one-direction", kind: "song", genre: "pop", year: 2011, durationLabel: "3:19", durationSeconds: 199, album: "Up All Night" },
  { title: "Story of My Life", artistSlug: "one-direction", kind: "song", genre: "pop", year: 2013, durationLabel: "4:05", durationSeconds: 245, album: "Midnight Memories" },
  { title: "Night Changes", artistSlug: "one-direction", kind: "song", genre: "pop", year: 2014, durationLabel: "3:47", durationSeconds: 227, album: "Four" },
  // Bruno Mars
  { title: "Uptown Funk", artistSlug: "bruno-mars", kind: "song", genre: "pop", year: 2014, durationLabel: "4:30", durationSeconds: 270, album: "Uptown Special (Mark Ronson feat. Bruno Mars)" },
  { title: "Just the Way You Are", artistSlug: "bruno-mars", kind: "song", genre: "pop", year: 2010, durationLabel: "3:40", durationSeconds: 220, album: "Doo-Wops & Hooligans" },
  { title: "Locked Out of Heaven", artistSlug: "bruno-mars", kind: "song", genre: "pop", year: 2012, durationLabel: "3:53", durationSeconds: 233, album: "Unorthodox Jukebox" },
  { title: "24K Magic", artistSlug: "bruno-mars", kind: "song", genre: "rnb", year: 2016, durationLabel: "3:45", durationSeconds: 225, album: "24K Magic" },
  // Shawn Mendes
  { title: "Stitches", artistSlug: "shawn-mendes", kind: "song", genre: "pop", year: 2015, durationLabel: "3:26", durationSeconds: 206, album: "Handwritten" },
  { title: "Señorita", artistSlug: "shawn-mendes", kind: "song", genre: "pop", year: 2019, durationLabel: "3:10", durationSeconds: 190, album: "Señorita (with Camila Cabello)" },
  { title: "There's Nothing Holdin' Me Back", artistSlug: "shawn-mendes", kind: "song", genre: "pop", year: 2016, durationLabel: "3:19", durationSeconds: 199, album: "Illuminate" },
  { title: "Treat You Better", artistSlug: "shawn-mendes", kind: "song", genre: "pop", year: 2016, durationLabel: "3:07", durationSeconds: 187, album: "Illuminate" },
  // Maroon 5
  { title: "Sugar", artistSlug: "maroon-5", kind: "song", genre: "pop", year: 2014, durationLabel: "3:55", durationSeconds: 235, album: "V" },
  { title: "Memories", artistSlug: "maroon-5", kind: "song", genre: "pop", year: 2019, durationLabel: "3:09", durationSeconds: 189, album: "Jordi" },
  { title: "Girls Like You", artistSlug: "maroon-5", kind: "song", genre: "pop", year: 2018, durationLabel: "3:35", durationSeconds: 215, album: "Red Pill Blues" },
  { title: "Maps", artistSlug: "maroon-5", kind: "song", genre: "pop", year: 2014, durationLabel: "3:10", durationSeconds: 190, album: "V" },
  // ONE OK ROCK
  { title: "Wherever You Are", artistSlug: "oneokrock", kind: "song", genre: "rock", year: 2014, durationLabel: "4:15", durationSeconds: 255, album: "35xxxv" },
  { title: "The Beginning", artistSlug: "oneokrock", kind: "song", genre: "rock", year: 2012, durationLabel: "4:02", durationSeconds: 242, album: "Zanzibar" },
  { title: "Wasted Nights", artistSlug: "oneokrock", kind: "song", genre: "rock", year: 2017, durationLabel: "4:21", durationSeconds: 261, album: "Ambitions" },
  { title: "Stand Out Fit In", artistSlug: "oneokrock", kind: "song", genre: "rock", year: 2018, durationLabel: "3:34", durationSeconds: 214, album: "Eye of the Storm" },
  // BLACKPINK
  { title: "Pink Venom", artistSlug: "blackpink", kind: "song", genre: "kpop", year: 2022, durationLabel: "3:07", durationSeconds: 187, album: "Born Pink" },
  { title: "How You Like That", artistSlug: "blackpink", kind: "song", genre: "kpop", year: 2020, durationLabel: "3:01", durationSeconds: 181 },
  { title: "Kill This Love", artistSlug: "blackpink", kind: "song", genre: "kpop", year: 2019, durationLabel: "3:11", durationSeconds: 191, album: "Kill This Love EP" },
  { title: "Shut Down", artistSlug: "blackpink", kind: "song", genre: "kpop", year: 2022, durationLabel: "2:55", durationSeconds: 175, album: "Born Pink" },
  // BTS
  { title: "Dynamite", artistSlug: "bts", kind: "song", genre: "kpop", year: 2020, durationLabel: "3:19", durationSeconds: 199 },
  { title: "Butter", artistSlug: "bts", kind: "song", genre: "kpop", year: 2021, durationLabel: "2:42", durationSeconds: 162 },
  { title: "Spring Day", nativeTitle: "봄날", artistSlug: "bts", kind: "song", genre: "kpop", year: 2017, durationLabel: "4:34", durationSeconds: 274, album: "You Never Walk Alone" },
  { title: "Boy With Luv", nativeTitle: "작은 것들을 위한 시", artistSlug: "bts", kind: "song", genre: "kpop", year: 2019, durationLabel: "3:19", durationSeconds: 199, album: "Map of the Soul: Persona" },
  // NewJeans
  { title: "Super Shy", artistSlug: "newjeans", kind: "song", genre: "kpop", year: 2023, durationLabel: "2:34", durationSeconds: 154, album: "Get Up" },
  { title: "Ditto", artistSlug: "newjeans", kind: "song", genre: "kpop", year: 2022, durationLabel: "3:05", durationSeconds: 185, album: "NewJeans 'OMG'" },
  { title: "Hype Boy", artistSlug: "newjeans", kind: "song", genre: "kpop", year: 2022, durationLabel: "2:56", durationSeconds: 176, album: "NewJeans 1st EP" },
  { title: "OMG", artistSlug: "newjeans", kind: "song", genre: "kpop", year: 2023, durationLabel: "3:32", durationSeconds: 212, album: "NewJeans 'OMG'" },
  // Eminem
  { title: "Lose Yourself", artistSlug: "eminem", kind: "song", genre: "hip-hop", year: 2002, durationLabel: "5:26", durationSeconds: 326, album: "8 Mile Soundtrack" },
  { title: "Without Me", artistSlug: "eminem", kind: "song", genre: "hip-hop", year: 2002, durationLabel: "4:50", durationSeconds: 290, album: "The Eminem Show" },
  { title: "The Real Slim Shady", artistSlug: "eminem", kind: "song", genre: "hip-hop", year: 2000, durationLabel: "4:44", durationSeconds: 284, album: "The Marshall Mathers LP" },
  { title: "Not Afraid", artistSlug: "eminem", kind: "song", genre: "hip-hop", year: 2010, durationLabel: "4:08", durationSeconds: 248, album: "Recovery" },
  // The Chainsmokers
  { title: "Closer", artistSlug: "the-chainsmokers", kind: "song", genre: "electronic", year: 2016, durationLabel: "4:04", durationSeconds: 244, album: "Closer (feat. Halsey)" },
  { title: "Something Just Like This", artistSlug: "the-chainsmokers", kind: "song", genre: "electronic", year: 2017, durationLabel: "4:07", durationSeconds: 247, album: "Something Just Like This (with Coldplay)" },
  { title: "Don't Let Me Down", artistSlug: "the-chainsmokers", kind: "song", genre: "electronic", year: 2016, durationLabel: "3:28", durationSeconds: 208, album: "Don't Let Me Down (feat. Daya)" },
  { title: "Roses", artistSlug: "the-chainsmokers", kind: "song", genre: "electronic", year: 2015, durationLabel: "3:46", durationSeconds: 226, album: "Roses (feat. ROZES)" },
  // Coldplay
  { title: "Viva La Vida", artistSlug: "coldplay", kind: "song", genre: "rock", year: 2008, durationLabel: "4:01", durationSeconds: 241, album: "Viva la Vida or Death and All His Friends" },
  { title: "Yellow", artistSlug: "coldplay", kind: "song", genre: "rock", year: 2000, durationLabel: "4:26", durationSeconds: 266, album: "Parachutes" },
  { title: "Fix You", artistSlug: "coldplay", kind: "song", genre: "rock", year: 2005, durationLabel: "4:54", durationSeconds: 294, album: "X&Y" },
  { title: "A Sky Full of Stars", artistSlug: "coldplay", kind: "song", genre: "electronic", year: 2014, durationLabel: "4:27", durationSeconds: 267, album: "Ghost Stories" },
  // Arijit Singh
  { title: "Tum Hi Ho", nativeTitle: "तुम ही हो", artistSlug: "arijit-singh", kind: "song", genre: "ballad", year: 2013, durationLabel: "4:22", durationSeconds: 262, album: "Aashiqui 2" },
  { title: "Kesariya", nativeTitle: "केसरिया", artistSlug: "arijit-singh", kind: "song", genre: "ballad", year: 2022, durationLabel: "4:28", durationSeconds: 268, album: "Brahmāstra" },
  { title: "Channa Mereya", nativeTitle: "चन्ना मेरेया", artistSlug: "arijit-singh", kind: "song", genre: "ballad", year: 2016, durationLabel: "4:49", durationSeconds: 289, album: "Ae Dil Hai Mushkil" },
  { title: "Apna Bana Le", nativeTitle: "अपना बना ले", artistSlug: "arijit-singh", kind: "song", genre: "ballad", year: 2022, durationLabel: "4:20", durationSeconds: 260, album: "Bhediya" },
  // The Weeknd
  { title: "Blinding Lights", artistSlug: "the-weeknd", kind: "song", genre: "rnb", year: 2019, durationLabel: "3:20", durationSeconds: 200 },
  { title: "Starboy", artistSlug: "the-weeknd", kind: "song", genre: "rnb", year: 2016, durationLabel: "3:50", durationSeconds: 230, album: "Starboy (feat. Daft Punk)" },
  { title: "Save Your Tears", artistSlug: "the-weeknd", kind: "song", genre: "rnb", year: 2020, durationLabel: "3:35", durationSeconds: 215 },
  { title: "Die For You", artistSlug: "the-weeknd", kind: "song", genre: "rnb", year: 2023, durationLabel: "3:20", durationSeconds: 200 },
  // Charlie Puth
  { title: "See You Again", artistSlug: "charlie-puth", kind: "song", genre: "pop", year: 2015, durationLabel: "3:49", durationSeconds: 229, album: "See You Again (feat. Wiz Khalifa)" },
  { title: "Attention", artistSlug: "charlie-puth", kind: "song", genre: "pop", year: 2017, durationLabel: "3:28", durationSeconds: 208 },
  { title: "We Don't Talk Anymore", artistSlug: "charlie-puth", kind: "song", genre: "pop", year: 2016, durationLabel: "3:37", durationSeconds: 217, album: "We Don't Talk Anymore (feat. Selena Gomez)" },
  { title: "Light Switch", artistSlug: "charlie-puth", kind: "song", genre: "pop", year: 2022, durationLabel: "3:07", durationSeconds: 187 },
  // Justin Bieber
  { title: "Sorry", artistSlug: "justin-bieber", kind: "song", genre: "pop", year: 2015, durationLabel: "3:20", durationSeconds: 200 },
  { title: "Peaches", artistSlug: "justin-bieber", kind: "song", genre: "pop", year: 2021, durationLabel: "3:18", durationSeconds: 198 },
  { title: "Ghost", artistSlug: "justin-bieber", kind: "song", genre: "pop", year: 2021, durationLabel: "2:32", durationSeconds: 152 },
  { title: "Stay", artistSlug: "justin-bieber", kind: "song", genre: "pop", year: 2021, durationLabel: "2:21", durationSeconds: 141, album: "Stay (with The Kid LAROI)" },
  // TWICE
  { title: "What is Love?", artistSlug: "twice", kind: "song", genre: "kpop", year: 2018, durationLabel: "3:28", durationSeconds: 208 },
  { title: "Feel Special", artistSlug: "twice", kind: "song", genre: "kpop", year: 2019, durationLabel: "3:26", durationSeconds: 206 },
  { title: "The Feels", artistSlug: "twice", kind: "song", genre: "kpop", year: 2021, durationLabel: "3:18", durationSeconds: 198 },
  { title: "SET ME FREE", artistSlug: "twice", kind: "song", genre: "kpop", year: 2023, durationLabel: "3:09", durationSeconds: 189 },
];

type RealTrackEntry = (typeof REAL_TRACKS)[number];

function enrichSongDescription(
  entry: RealTrackEntry,
  artistTitle: string,
  sourceTitle?: string,
): string {
  const release = entry.album
    ? `${entry.album} (${entry.year})`
    : String(entry.year);
  const parts = [
    `${entry.title} by ${artistTitle} is a ${entry.genre} ${entry.kind} released in ${release}. The production is tight, the vocal delivery is immediate, and the hook stays memorable after the first listen.`,
  ];

  if (sourceTitle) {
    parts.push(
      `It is closely tied to ${sourceTitle} and frequently appears in anime OST and soundtrack-focused collections on EntertainVerse.`,
    );
  }

  parts.push(
    `${entry.title} has become a repeat-play staple for ${artistTitle} fans — ideal for mood playlists, late-night sessions, and discovery queues built around modern ${entry.genre} hits.`,
  );
  parts.push(
    `Whether you are revisiting a favorite era or hearing it for the first time, ${entry.title} shows why ${artistTitle} remains essential listening across the catalog.`,
  );

  return parts.join(" ");
}

export function generateMusicItems(artists: ArtistSeed[], content: ContentSeedBase[]): MusicSeed[] {
  const artistBySlug = new Map(artists.map((a) => [a.slug, a]));
  const contentSlugs = new Set(content.map((c) => c.slug));
  const tracks: MusicSeed[] = [];

  for (let i = 0; i < REAL_TRACKS.length; i++) {
    const entry = REAL_TRACKS[i]!;
    const artist = artistBySlug.get(entry.artistSlug);
    if (!artist) continue;
    const contentSlug = entry.contentSlug && contentSlugs.has(entry.contentSlug) ? entry.contentSlug : undefined;
    const sourceTitle = contentSlug
      ? content.find((c) => c.slug === contentSlug)?.title
      : undefined;
    const slug = slugify(`${entry.artistSlug}-${entry.title}`);

    tracks.push({
      slug,
      title: entry.title,
      nativeTitle: entry.nativeTitle,
      artist: artist.title,
      artistSlug: artist.slug,
      kind: entry.kind,
      description: enrichSongDescription(entry, artist.title, sourceTitle),
      lyrics: entry.lyrics,
      source: sourceTitle ?? `${artist.title} — Studio Album`,
      contentSlug,
      album: entry.album ?? (entry.kind === "album" ? `${entry.title} (Complete Edition)` : `${artist.title} Singles`),
      language: artist.languages[0],
      genreLabels: [entry.genre, pick(SONG_GENRES, i + 4)],
      rating: catalogRating(7.5, (i % 20) * 0.1),
      year: entry.year,
      durationLabel: entry.durationLabel,
      durationSeconds: entry.durationSeconds,
      imageUrl: songImageUrl(slug),
      backdropUrl: songImageUrl(slug),
      accent: pick(ACCENTS, i),
      trendingLabel: `Trending on EntertainVerse · ${entry.kind.toUpperCase()}`,
      creditLabel: `By ${artist.title}`,
      featuredRank: i < 20 ? i + 1 : undefined,
      catalogReviews: [
        review(pick(USER_PROFILES, i).name, catalogRating(8, (i % 3) * 0.3), `${entry.title} is on loop. Perfect ${entry.kind} energy — the hook lands immediately and the production still sounds fresh on repeat. Easily one of the best tracks in ${artist.title}'s catalog on EntertainVerse.`, pick(ACCENTS, i)),
      ],
    });
  }

  return tracks;
}

export function generateUserSeeds(): UserSeed[] {
  return USER_PROFILES.map((user, index) => ({
    email: user.email,
    password: "User123!",
    name: user.name,
    handle: user.handle,
    avatarColor: pick(["#ff00cc", "#00d4ff", "#ffd000", "#ae00ff", "#00ff88", "#ff6b35"], index),
    bio: user.bio,
    location: user.location,
    aiTasteScore: 72 + (index % 28),
  }));
}

export function generateCommunitySeeds(_users: UserSeed[]): CommunitySeed[] {
  return GLOBAL_COMMUNITY_SEEDS.map((seed) => ({
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    visibility: seed.visibility,
    activityLevel: seed.activityLevel,
    accent: seed.accent,
    posts: (seed.posts ?? []).map((post) => ({
      authorEmail: seed.ownerEmail,
      title: post.title,
      content: post.content,
      kind: "POST" as const,
      likeCount: 12,
      commentCount: 3,
      shareCount: 1,
    })),
  }));
}

export function generateCollectionSeeds(
  _users: UserSeed[],
  _content: ContentSeedBase[],
  _tracks: MusicSeed[],
): CollectionSeed[] {
  return buildCollectionSeeds();
}

export const CONTENT_ITEMS = generateContentItems();
export const ARTIST_ITEMS = generateArtistItems();
export const MUSIC_ITEMS = generateMusicItems(ARTIST_ITEMS, CONTENT_ITEMS);
export const USER_SEEDS = generateUserSeeds();
export const COMMUNITY_SEEDS = generateCommunitySeeds(USER_SEEDS);
export const COLLECTION_SEEDS = generateCollectionSeeds(USER_SEEDS, CONTENT_ITEMS, MUSIC_ITEMS);

export const DEMO_USER = {
  email: USER_SEEDS[0]!.email,
  password: USER_SEEDS[0]!.password,
  name: USER_SEEDS[0]!.name,
  handle: USER_SEEDS[0]!.handle,
  avatarColor: USER_SEEDS[0]!.avatarColor,
  aiTasteScore: USER_SEEDS[0]!.aiTasteScore,
} as const;

export function buildWatchlistForUser(userIndex: number, content: ContentSeedBase[]) {
  const statuses = ["WATCHING", "PENDING", "COMPLETED"] as const;
  const priorities = ["HIGH", "NORMAL"] as const;
  return Array.from({ length: 8 }, (_, i) => ({
    slug: content[(userIndex * 4 + i) % content.length]!.slug,
    priority: pick(priorities, i),
    status: pick(statuses, userIndex + i),
  }));
}

export { VOICE_ACTORS };
