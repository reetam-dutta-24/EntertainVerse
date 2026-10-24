import type { AccentColor } from "@/lib/catalog-enums";
import type { ContentSeedBase } from "./helpers";
import { contentImageUrl } from "./content-images";

type CuratedDraft = Omit<ContentSeedBase, "imageUrl" | "backdropUrl"> & {
  bannerKey: string;
};

const ACCENTS: AccentColor[] = [
  "pink", "purple", "cyan", "blue", "fuchsia", "violet", "teal", "rose", "indigo", "emerald",
];

function pickAccent(index: number): AccentColor {
  return ACCENTS[index % ACCENTS.length]!;
}

function series(
  draft: CuratedDraft,
  opts: {
    seasonCount: number;
    episodeCount: number;
    episodeDuration?: string;
    airedFrom?: string;
    airedTo?: string;
    malScore?: number;
  },
): CuratedDraft {
  return {
    episodeDuration: opts.episodeDuration ?? draft.episodeDuration ?? "24 Min",
    status: "Completed",
    ...draft,
    meta: `${opts.seasonCount} Season${opts.seasonCount === 1 ? "" : "s"}, ${opts.episodeCount} Episodes`,
    seasonCount: opts.seasonCount,
    episodeCount: opts.episodeCount,
    seasonLabel: "Season 1",
    airedFrom: opts.airedFrom,
    airedTo: opts.airedTo,
    malScore: opts.malScore,
  };
}

function movie(draft: CuratedDraft, runtime: string): CuratedDraft {
  return {
    status: "Released",
    episodeDuration: runtime,
    meta: "Feature Film",
    ...draft,
  };
}

function doc(draft: CuratedDraft, runtime: string): CuratedDraft {
  return movie({ ...draft, type: "documentary" }, runtime);
}

function franchise(
  bannerKey: string,
  films: Array<Omit<CuratedDraft, "bannerKey" | "type"> & { runtime: string }>,
  shared: Partial<CuratedDraft> = {},
): CuratedDraft[] {
  return films.map((film) =>
    movie(
      {
        type: "movie",
        bannerKey,
        accent: film.accent ?? shared.accent,
        country: film.country ?? shared.country,
        studio: film.studio ?? shared.studio,
        ...shared,
        ...film,
      },
      film.runtime,
    ),
  );
}

function enrichDescription(item: CuratedDraft): CuratedDraft {
  const lead = item.description?.trim() ?? "";
  const synopsis = item.synopsis?.trim() ?? "";
  const genre = item.genreLabels[0] ?? "drama";
  const typeLabel =
    item.type === "anime"
      ? "anime"
      : item.type === "show"
        ? "series"
        : item.type === "documentary"
          ? "documentary"
          : "film";

  const parts: string[] = [];
  if (lead) parts.push(lead);
  if (synopsis && synopsis !== lead) parts.push(synopsis);

  parts.push(
    `${item.title} stands out as a ${genre} ${typeLabel} with sharp pacing, layered characters, and set pieces that fans revisit on AniVerse.`,
  );

  const credit =
    item.studio && item.director
      ? `${item.studio}, directed by ${item.director}`
      : item.studio ?? (item.director ? `director ${item.director}` : null);

  if (credit && item.year) {
    parts.push(
      `Released in ${item.year} by ${credit}, it continues to draw new viewers alongside devoted fans who appreciate its craft and emotional payoff.`,
    );
  } else if (item.year) {
    parts.push(
      `Since its ${item.year} release, it has remained a talking point for audiences who value strong storytelling and memorable performances.`,
    );
  } else {
    parts.push(
      `It remains a talking point for audiences who value strong storytelling and memorable performances.`,
    );
  }

  const fullDescription = parts.join(" ");
  return {
    ...item,
    description: fullDescription,
    synopsis: synopsis || lead || fullDescription,
  };
}

function applyImages(items: CuratedDraft[]): ContentSeedBase[] {
  return items.map((item) => {
    const enriched = enrichDescription(item);
    const url = contentImageUrl(item.bannerKey);
    const { bannerKey: _bannerKey, ...seed } = enriched;
    return { ...seed, imageUrl: url, backdropUrl: url };
  });
}

let accentIndex = 0;
function nextAccent(): AccentColor {
  return pickAccent(accentIndex++);
}

const ANIME: CuratedDraft[] = [
  series(
    {
      slug: "death-note",
      title: "Death Note",
      nativeTitle: "デスノート",
      type: "anime",
      bannerKey: "death-note",
      accent: nextAccent(),
      genreLabels: ["psychological", "supernatural", "thriller"],
      languages: ["japanese", "english"],
      rating: 9.0,
      year: 2006,
      studio: "Madhouse",
      director: "Tetsurō Araki",
      composer: "Yoshihisa Hirano & Hideki Taniuchi",
      originalAuthor: "Tsugumi Ohba",
      sourceMaterial: "Manga",
      network: "NTV",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.9,
      broadcast: "Tuesdays 12:56 AM JST",
      description:
        "When high school student Light Yagami finds a supernatural notebook, he gains the power to kill anyone whose name he writes inside it — and begins a secret crusade to rid the world of criminals.",
      synopsis:
        "Light Yagami discovers the Death Note dropped by the shinigami Ryuk and uses it to execute criminals under the alias Kira. Detective L closes in with a battle of wits that tests morality, justice, and obsession.",
    },
    { seasonCount: 1, episodeCount: 37, airedFrom: "Oct 2006", airedTo: "Jun 2007", malScore: 8.62 },
  ),
  series(
    {
      slug: "tokyo-ghoul",
      title: "Tokyo Ghoul",
      nativeTitle: "東京喰種",
      type: "anime",
      bannerKey: "tokyo-ghoul",
      accent: nextAccent(),
      genreLabels: ["action", "supernatural", "psychological"],
      languages: ["japanese", "english"],
      rating: 8.0,
      year: 2014,
      studio: "Pierrot",
      director: "Shuhei Morita",
      originalAuthor: "Sui Ishida",
      sourceMaterial: "Manga",
      network: "Tokyo MX",
      country: "Japan",
      ageRating: "18+",
      imdbRating: 7.8,
      description:
        "Ken Kaneki survives a deadly encounter with a ghoul, only to become half-human and half-monster — trapped between two worlds in a city where flesh-eating creatures hide in plain sight.",
      synopsis:
        "After a transplant turns him into a half-ghoul, Kaneki is pulled into Tokyo's underground ghoul society while struggling to protect the people he loves and hold on to his humanity.",
    },
    { seasonCount: 4, episodeCount: 48, airedFrom: "Jul 2014", airedTo: "Dec 2018", malScore: 7.79 },
  ),
  series(
    {
      slug: "haikyuu",
      title: "Haikyu!!",
      nativeTitle: "ハイキュー!!",
      type: "anime",
      bannerKey: "haikyuu",
      accent: nextAccent(),
      genreLabels: ["action", "comedy", "drama"],
      languages: ["japanese", "english"],
      rating: 8.7,
      year: 2014,
      studio: "Production I.G",
      director: "Susumu Mitsunaka",
      originalAuthor: "Haruichi Furudate",
      sourceMaterial: "Manga",
      network: "MBS",
      country: "Japan",
      ageRating: "13+",
      imdbRating: 8.7,
      description:
        "Short but fearless Hinata Shoyo chases his dream of becoming a volleyball ace, teaming up with rival genius setter Tobio Kageyama at Karasuno High.",
      synopsis:
        "Haikyu!! follows Karasuno High's volleyball team as underdogs rebuild their legacy through teamwork, rivalry, and relentless practice on the court.",
    },
    { seasonCount: 4, episodeCount: 85, airedFrom: "Apr 2014", airedTo: "Dec 2020", malScore: 8.43 },
  ),
  series(
    {
      slug: "blue-lock",
      title: "Blue Lock",
      nativeTitle: "ブルーロック",
      type: "anime",
      bannerKey: "blue-lock",
      accent: nextAccent(),
      genreLabels: ["action", "psychological", "sports"],
      languages: ["japanese", "english"],
      rating: 8.2,
      year: 2022,
      studio: "8bit",
      director: "Tetsu Watanabe",
      originalAuthor: "Muneyuki Kaneshiro",
      sourceMaterial: "Manga",
      network: "TV Asahi",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.2,
      description:
        "Japan's national team launches Blue Lock, a ruthless training program designed to forge one ego-driven striker capable of leading them to World Cup glory.",
      synopsis:
        "Yoichi Isagi enters a win-or-leave facility where 300 forwards compete through high-stakes matches that reward selfish genius over traditional teamwork.",
    },
    { seasonCount: 1, episodeCount: 24, airedFrom: "Oct 2022", airedTo: "Mar 2023", malScore: 8.16 },
  ),
  series(
    {
      slug: "jujutsu-kaisen",
      title: "Jujutsu Kaisen",
      nativeTitle: "呪術廻戦",
      type: "anime",
      bannerKey: "jujutsu-kaisen",
      accent: nextAccent(),
      genreLabels: ["action", "supernatural", "fantasy"],
      languages: ["japanese", "english"],
      rating: 8.6,
      year: 2020,
      studio: "MAPPA",
      director: "Sunghoo Park",
      originalAuthor: "Gege Akutami",
      sourceMaterial: "Manga",
      network: "MBS",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.5,
      description:
        "Yuji Itadori swallows a cursed finger and joins Tokyo Jujutsu High, learning to fight grotesque Curses alongside sorcerers like Megumi and Nobara.",
      synopsis:
        "After becoming host to the King of Curses, Sukuna, Yuji trains under Satoru Gojo while battling deadly cursed spirits threatening humanity.",
    },
    { seasonCount: 2, episodeCount: 47, airedFrom: "Oct 2020", airedTo: "Dec 2023", malScore: 8.54 },
  ),
  series(
    {
      slug: "naruto-shippuden",
      title: "Naruto: Shippuden",
      nativeTitle: "ナルト 疾風伝",
      type: "anime",
      bannerKey: "naruto-shippuden",
      accent: nextAccent(),
      genreLabels: ["action", "fantasy", "adventure"],
      languages: ["japanese", "english"],
      rating: 8.7,
      year: 2007,
      studio: "Pierrot",
      director: "Hayato Date",
      originalAuthor: "Masashi Kishimoto",
      sourceMaterial: "Manga",
      network: "TV Tokyo",
      country: "Japan",
      ageRating: "13+",
      imdbRating: 8.7,
      description:
        "Two and a half years after leaving the village, Naruto Uzumaki returns stronger — ready to rescue Sasuke and protect the ninja world from the Akatsuki.",
      synopsis:
        "Naruto: Shippuden chronicles Naruto's growth into a powerful shinobi as Akatsuki hunts the Tailed Beasts and old bonds are tested by war.",
    },
    { seasonCount: 21, episodeCount: 500, airedFrom: "Feb 2007", airedTo: "Mar 2017", malScore: 8.28 },
  ),
  series(
    {
      slug: "death-parade",
      title: "Death Parade",
      nativeTitle: "デス・パレード",
      type: "anime",
      bannerKey: "death-parade",
      accent: nextAccent(),
      genreLabels: ["psychological", "mystery", "supernatural"],
      languages: ["japanese", "english"],
      rating: 8.1,
      year: 2015,
      studio: "Madhouse",
      director: "Yuzuru Tachikawa",
      originalAuthor: "Yuzuru Tachikawa",
      sourceMaterial: "Original",
      network: "Fuji TV",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.0,
      description:
        "In a bar between life and death, arbiter Decim judges souls through twisted games that reveal who they truly were in life.",
      synopsis:
        "Death Parade explores guilt, regret, and human nature as recently deceased guests compete in bar games that decide whether they are reincarnated or sent to the void.",
    },
    { seasonCount: 1, episodeCount: 12, airedFrom: "Jan 2015", airedTo: "Mar 2015", malScore: 8.14 },
  ),
  series(
    {
      slug: "re-zero",
      title: "Re:Zero − Starting Life in Another World",
      nativeTitle: "Re:ゼロから始める異世界生活",
      type: "anime",
      bannerKey: "re-zero",
      accent: nextAccent(),
      genreLabels: ["fantasy", "psychological", "drama"],
      languages: ["japanese", "english"],
      rating: 8.3,
      year: 2016,
      studio: "White Fox",
      director: "Masaharu Watanabe",
      originalAuthor: "Tappei Nagatsuki",
      sourceMaterial: "Light Novel",
      network: "TV Tokyo",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.1,
      description:
        "Subaru Natsuki is summoned to a fantasy world with one cruel ability: Return by Death, forcing him to relive suffering until he saves those he loves.",
      synopsis:
        "Re:Zero follows Subaru through loops of failure and trauma as he navigates royal politics, witch cult conspiracies, and the cost of immortality through suffering.",
    },
    { seasonCount: 3, episodeCount: 50, airedFrom: "Apr 2016", airedTo: "Present", malScore: 8.24 },
  ),
  series(
    {
      slug: "classroom-of-the-elite",
      title: "Classroom of the Elite",
      nativeTitle: "ようこそ実力至上主義の教室へ",
      type: "anime",
      bannerKey: "classroom-of-the-elite",
      accent: nextAccent(),
      genreLabels: ["psychological", "drama", "mystery"],
      languages: ["japanese", "english"],
      rating: 8.0,
      year: 2017,
      studio: "Lerche",
      director: "Seiji Kishi",
      originalAuthor: "Shōgo Kinugasa",
      sourceMaterial: "Light Novel",
      network: "AT-X",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 7.9,
      description:
        "At a prestigious high school where merit rules everything, cynical prodigy Kiyotaka Ayanokoji manipulates classmates from the shadows to win class battles.",
      synopsis:
        "Classroom of the Elite pits classes against one another in psychological tests of loyalty, strategy, and hidden talent at Advanced Nurturing High School.",
    },
    { seasonCount: 3, episodeCount: 39, airedFrom: "Jul 2017", airedTo: "Present", malScore: 8.05 },
  ),
  series(
    {
      slug: "demon-slayer",
      title: "Demon Slayer: Kimetsu no Yaiba",
      nativeTitle: "鬼滅の刃",
      type: "anime",
      bannerKey: "demon-slayer",
      accent: nextAccent(),
      genreLabels: ["action", "supernatural", "fantasy"],
      languages: ["japanese", "english"],
      rating: 8.7,
      year: 2019,
      studio: "ufotable",
      director: "Haruo Sotozaki",
      originalAuthor: "Koyoharu Gotouge",
      sourceMaterial: "Manga",
      network: "Fuji TV",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.6,
      description:
        "After demons slaughter his family, Tanjiro Kamado joins the Demon Slayer Corps to cure his sister Nezuko and avenge the fallen.",
      synopsis:
        "Demon Slayer blends breathtaking animation with a heartfelt journey as Tanjiro hunts demons while protecting the last remnant of his family.",
    },
    { seasonCount: 4, episodeCount: 56, airedFrom: "Apr 2019", airedTo: "Present", malScore: 8.43 },
  ),
  series(
    {
      slug: "dragon-ball-z",
      title: "Dragon Ball Z",
      nativeTitle: "ドラゴンボールZ",
      type: "anime",
      bannerKey: "dragon-ball-z",
      accent: nextAccent(),
      genreLabels: ["action", "fantasy", "adventure"],
      languages: ["japanese", "english"],
      rating: 8.8,
      year: 1989,
      studio: "Toei Animation",
      director: "Daisuke Nishio",
      originalAuthor: "Akira Toriyama",
      sourceMaterial: "Manga",
      network: "Fuji TV",
      country: "Japan",
      ageRating: "13+",
      imdbRating: 8.8,
      description:
        "Goku and the Z Fighters defend Earth from ever-stronger villains — from Saiyan invaders to planet-killing androids and magical threats.",
      synopsis:
        "Dragon Ball Z escalates Akira Toriyama's martial-arts fantasy into galaxy-spanning battles of power, sacrifice, and Super Saiyan legend.",
    },
    { seasonCount: 9, episodeCount: 291, airedFrom: "Apr 1989", airedTo: "Jan 1996", malScore: 8.20 },
  ),
  series(
    {
      slug: "vinland-saga",
      title: "Vinland Saga",
      nativeTitle: "ヴィンランド・サガ",
      type: "anime",
      bannerKey: "vinland-saga",
      accent: nextAccent(),
      genreLabels: ["action", "drama", "adventure"],
      languages: ["japanese", "english"],
      rating: 8.8,
      year: 2019,
      studio: "Wit Studio / MAPPA",
      director: "Shūhei Yabuta",
      originalAuthor: "Makoto Yukimura",
      sourceMaterial: "Manga",
      network: "NHK General TV",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 8.8,
      description:
        "Young Thorfinn seeks revenge against the Viking mercenary Askeladd in a brutal saga that evolves from blood-soaked warfare into a search for peace.",
      synopsis:
        "Vinland Saga reimagines Norse history through Thorfinn's transformation from revenge-driven warrior to someone seeking a land free of slavery and war.",
    },
    { seasonCount: 2, episodeCount: 48, airedFrom: "Jul 2019", airedTo: "Jun 2023", malScore: 8.55 },
  ),
  series(
    {
      slug: "attack-on-titan",
      title: "Attack on Titan",
      nativeTitle: "進撃の巨人",
      type: "anime",
      bannerKey: "attack-on-titan",
      accent: nextAccent(),
      genreLabels: ["action", "drama", "mystery"],
      languages: ["japanese", "english"],
      rating: 9.1,
      year: 2013,
      studio: "Wit Studio / MAPPA",
      director: "Tetsurō Araki / Yuichiro Hayashi",
      originalAuthor: "Hajime Isayama",
      sourceMaterial: "Manga",
      network: "NHK General TV",
      country: "Japan",
      ageRating: "16+",
      imdbRating: 9.0,
      description:
        "Humanity lives behind walls until Titans breach their last sanctuary, pushing Eren Yeager and the Survey Corps into a war for survival and truth.",
      synopsis:
        "Attack on Titan unravels a conspiracy spanning generations as Eren, Mikasa, and Armin confront the horrors beyond the walls and the cost of freedom.",
    },
    { seasonCount: 4, episodeCount: 87, airedFrom: "Apr 2013", airedTo: "Nov 2023", malScore: 8.55 },
  ),
];

const SHOWS: CuratedDraft[] = [
  series({ slug: "squid-game", title: "Squid Game", type: "show", bannerKey: "squid-game", accent: nextAccent(), genreLabels: ["thriller", "drama", "mystery"], languages: ["korean", "english"], rating: 8.0, year: 2021, studio: "Siren Pictures", director: "Hwang Dong-hyuk", network: "Netflix", country: "South Korea", ageRating: "18+", imdbRating: 8.0, description: "Hundreds of cash-strapped players accept a mysterious invitation to compete in children's games for a massive prize — with deadly stakes.", synopsis: "Seong Gi-hun and 455 others enter a secret tournament where every round of playground games can end in elimination." }, { seasonCount: 1, episodeCount: 9, airedFrom: "Sep 2021", airedTo: "Present" }),
  series({ slug: "alice-in-borderland", title: "Alice in Borderland", nativeTitle: "今際の国のアリス", type: "show", bannerKey: "alice-in-borderland", accent: nextAccent(), genreLabels: ["thriller", "sci-fi", "mystery"], languages: ["japanese", "english"], rating: 7.8, year: 2020, studio: "Robot Communications", director: "Shinsuke Sato", network: "Netflix", country: "Japan", ageRating: "18+", imdbRating: 7.8, description: "Gamer Arisu and his friends are transported to an empty Tokyo where they must survive lethal games to extend their visas.", synopsis: "Alice in Borderland pits strangers against surreal survival games orchestrated by unseen rulers of the Borderland." }, { seasonCount: 2, episodeCount: 16, airedFrom: "Dec 2020", airedTo: "Dec 2022" }),
  series({ slug: "all-of-us-are-dead", title: "All of Us Are Dead", nativeTitle: "지금 우리 학교는", type: "show", bannerKey: "all-of-us-are-dead", accent: nextAccent(), genreLabels: ["thriller", "drama", "action"], languages: ["korean", "english"], rating: 7.5, year: 2022, studio: "Kim Nam-soo Productions", director: "Lee Jae-kyoo", network: "Netflix", country: "South Korea", ageRating: "18+", imdbRating: 7.5, description: "A zombie outbreak traps students inside their high school, forcing classmates to fight for survival without outside help.", synopsis: "All of Us Are Dead follows teens barricaded in classrooms as a science experiment turns their school into ground zero." }, { seasonCount: 1, episodeCount: 12, airedFrom: "Jan 2022", airedTo: "Jan 2022" }),
  series({ slug: "flower-of-evil", title: "Flower of Evil", nativeTitle: "악의 꽃", type: "show", bannerKey: "flower-of-evil", accent: nextAccent(), genreLabels: ["thriller", "mystery", "drama"], languages: ["korean", "english"], rating: 8.7, year: 2020, studio: "Studio Dragon", director: "Kim Cheol-kyu", network: "tvN", country: "South Korea", ageRating: "16+", imdbRating: 8.7, description: "Detective Cha Ji-won investigates a serial murder case that leads uncomfortably close to her seemingly perfect husband.", synopsis: "Flower of Evil unravels Baek Hee-sung's hidden past as his wife closes in on the truth behind a string of killings." }, { seasonCount: 1, episodeCount: 16, airedFrom: "Jul 2020", airedTo: "Sep 2020" }),
  series({ slug: "elite", title: "Elite", type: "show", bannerKey: "elite", accent: nextAccent(), genreLabels: ["drama", "thriller", "mystery"], languages: ["spanish", "english"], rating: 7.5, year: 2018, studio: "Zeta Studios", director: "Ramón Salazar", network: "Netflix", country: "Spain", ageRating: "18+", imdbRating: 7.5, description: "Three working-class teens enroll at an exclusive Spanish private school, where ambition, sex, and murder collide.", synopsis: "Elite tracks Las Encinas students through scandal, class tension, and a central murder mystery spanning multiple seasons." }, { seasonCount: 7, episodeCount: 56, airedFrom: "Oct 2018", airedTo: "Present" }),
  series({ slug: "class", title: "Class", type: "show", bannerKey: "class", accent: nextAccent(), genreLabels: ["drama", "thriller", "mystery"], languages: ["hindi", "english"], rating: 7.0, year: 2023, studio: "Future East Film", director: "Ashim Ahluwalia", network: "Netflix", country: "India", ageRating: "18+", imdbRating: 7.0, description: "An Indian adaptation set at Hampton International, where three scholarship students upend the lives of wealthy classmates.", synopsis: "Class explores power, privilege, and violence when outsiders enter Delhi's most elite boarding school." }, { seasonCount: 1, episodeCount: 8, airedFrom: "Jun 2023", airedTo: "Jun 2023" }),
  series({ slug: "control-z", title: "Control Z", type: "show", bannerKey: "control-z", accent: nextAccent(), genreLabels: ["mystery", "thriller", "drama"], languages: ["spanish", "english"], rating: 7.2, year: 2020, studio: "Portafolio Studios", director: "Carlos López Estrada", network: "Netflix", country: "Mexico", ageRating: "16+", imdbRating: 7.2, description: "A hacker begins exposing students' secrets at an elite Mexican high school, and outcast Sofía tries to unmask them.", synopsis: "Control Z turns a graduation ceremony into chaos as anonymous leaks threaten every clique at National School." }, { seasonCount: 3, episodeCount: 24, airedFrom: "May 2020", airedTo: "May 2022" }),
  series({ slug: "13-reasons-why", title: "13 Reasons Why", type: "show", bannerKey: "13-reasons-why", accent: nextAccent(), genreLabels: ["drama", "mystery", "psychological"], languages: ["english"], rating: 7.5, year: 2017, studio: "July Moon Productions", director: "Brian Yorkey", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 7.5, description: "After Hannah Baker's suicide, cassette tapes reveal thirteen reasons why she ended her life — and who she holds responsible.", synopsis: "Clay Jensen listens to Hannah's recordings and confronts Liberty High's culture of bullying, trauma, and silence." }, { seasonCount: 4, episodeCount: 49, airedFrom: "Mar 2017", airedTo: "Jun 2020" }),
  series({ slug: "dark", title: "Dark", type: "show", bannerKey: "dark", accent: nextAccent(), genreLabels: ["sci-fi", "mystery", "thriller"], languages: ["german", "english"], rating: 8.7, year: 2017, studio: "Wiedemann & Berg", director: "Baran bo Odar", network: "Netflix", country: "Germany", ageRating: "16+", imdbRating: 8.7, description: "Children vanish in the German town of Winden, exposing four interconnected families and a wormhole spanning thirty-three years.", synopsis: "Dark is a time-travel puzzle where past, present, and future collide across generations in a cursed town." }, { seasonCount: 3, episodeCount: 26, airedFrom: "Dec 2017", airedTo: "Jun 2020" }),
  series({ slug: "stranger-things", title: "Stranger Things", type: "show", bannerKey: "stranger-things", accent: nextAccent(), genreLabels: ["sci-fi", "mystery", "drama"], languages: ["english"], rating: 8.7, year: 2016, studio: "21 Laps Entertainment", director: "The Duffer Brothers", network: "Netflix", country: "USA", ageRating: "16+", imdbRating: 8.7, description: "In 1980s Indiana, friends encounter supernatural forces and secret government experiments after a boy vanishes.", synopsis: "Stranger Things follows Eleven and the Hawkins kids as they battle creatures from the Upside Down." }, { seasonCount: 4, episodeCount: 42, airedFrom: "Jul 2016", airedTo: "Present" }),
  series({ slug: "euphoria", title: "Euphoria", type: "show", bannerKey: "euphoria", accent: nextAccent(), genreLabels: ["drama", "psychological", "romance"], languages: ["english"], rating: 8.3, year: 2019, studio: "A24", director: "Sam Levinson", network: "HBO", country: "USA", ageRating: "18+", imdbRating: 8.3, description: "Rue Bennett navigates addiction, identity, and toxic relationships alongside classmates in a raw portrait of Gen Z life.", synopsis: "Euphoria examines trauma, love, and self-destruction through stylized storytelling centered on Rue and Jules." }, { seasonCount: 2, episodeCount: 16, airedFrom: "Jun 2019", airedTo: "Present" }),
  series({ slug: "game-of-thrones", title: "Game of Thrones", type: "show", bannerKey: "game-of-thrones", accent: nextAccent(), genreLabels: ["fantasy", "drama", "action"], languages: ["english"], rating: 9.2, year: 2011, studio: "HBO", director: "David Benioff & D.B. Weiss", network: "HBO", country: "USA", ageRating: "18+", imdbRating: 9.2, description: "Noble families vie for the Iron Throne of Westeros while an ancient threat marches from the north.", synopsis: "Game of Thrones adapts George R.R. Martin's saga of power, betrayal, dragons, and the fight against the White Walkers." }, { seasonCount: 8, episodeCount: 73, airedFrom: "Apr 2011", airedTo: "May 2019" }),
  series({ slug: "wednesday", title: "Wednesday", type: "show", bannerKey: "wednesday", accent: nextAccent(), genreLabels: ["mystery", "comedy", "supernatural"], languages: ["english"], rating: 8.1, year: 2022, studio: "MGM Television", director: "Tim Burton", network: "Netflix", country: "USA", ageRating: "13+", imdbRating: 8.1, description: "Wednesday Addams investigates a murder spree while mastering her psychic abilities at Nevermore Academy.", synopsis: "Wednesday balances deadpan humor and gothic mystery as she uncovers secrets tied to her family's past." }, { seasonCount: 1, episodeCount: 8, airedFrom: "Nov 2022", airedTo: "Present" }),
  series({ slug: "breaking-bad", title: "Breaking Bad", type: "show", bannerKey: "breaking-bad", accent: nextAccent(), genreLabels: ["drama", "thriller", "crime"], languages: ["english"], rating: 9.5, year: 2008, studio: "High Bridge Productions", director: "Vince Gilligan", network: "AMC", country: "USA", ageRating: "18+", imdbRating: 9.5, description: "Chemistry teacher Walter White turns to cooking meth after a cancer diagnosis, transforming into the feared Heisenberg.", synopsis: "Breaking Bad charts Walter and Jesse Pinkman's descent into the Albuquerque drug trade and its violent consequences." }, { seasonCount: 5, episodeCount: 62, airedFrom: "Jan 2008", airedTo: "Sep 2013" }),
  series({ slug: "adolescence", title: "Adolescence", type: "show", bannerKey: "adolescence", accent: nextAccent(), genreLabels: ["drama", "crime", "psychological"], languages: ["english"], rating: 8.0, year: 2025, studio: "Netflix", director: "Stephen Graham", network: "Netflix", country: "UK", ageRating: "16+", imdbRating: 8.0, description: "A thirteen-year-old boy is arrested for murder, and each episode unfolds in a single continuous take exploring family and masculinity.", synopsis: "Adolescence examines how a community reacts when a teenager becomes the prime suspect in a shocking killing." }, { seasonCount: 1, episodeCount: 4, airedFrom: "Mar 2025", airedTo: "Mar 2025" }),
  series({ slug: "money-heist", title: "Money Heist", nativeTitle: "La Casa de Papel", type: "show", bannerKey: "money-heist", accent: nextAccent(), genreLabels: ["thriller", "drama", "action"], languages: ["spanish", "english"], rating: 8.2, year: 2017, studio: "Vancouver Media", director: "Álex Pina", network: "Netflix", country: "Spain", ageRating: "16+", imdbRating: 8.2, description: "The Professor recruits eight criminals to execute ambitious heists on the Royal Mint and Bank of Spain.", synopsis: "Money Heist follows codenamed robbers in red jumpsuits as they outwit authorities with elaborate plans." }, { seasonCount: 5, episodeCount: 41, airedFrom: "May 2017", airedTo: "Dec 2021" }),
  series({ slug: "you", title: "You", type: "show", bannerKey: "you", accent: nextAccent(), genreLabels: ["thriller", "psychological", "drama"], languages: ["english"], rating: 7.7, year: 2018, studio: "Berlanti Productions", director: "Greg Berlanti", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 7.7, description: "Charming bookstore manager Joe Goldberg becomes dangerously obsessed with the women he dates.", synopsis: "You follows Joe's inner monologue as stalking, murder, and literary references collide in city after city." }, { seasonCount: 4, episodeCount: 40, airedFrom: "Sep 2018", airedTo: "Present" }),
  series({ slug: "ozark", title: "Ozark", type: "show", bannerKey: "ozark", accent: nextAccent(), genreLabels: ["crime", "drama", "thriller"], languages: ["english"], rating: 8.4, year: 2017, studio: "Media Rights Capital", director: "Bill Dubuque", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 8.4, description: "Financial advisor Marty Byrde launders money for a cartel and relocates his family to Missouri's Lake of the Ozarks.", synopsis: "Ozark tracks the Byrdes as they navigate local criminals, FBI pressure, and their own fracturing family." }, { seasonCount: 4, episodeCount: 44, airedFrom: "Jul 2017", airedTo: "Apr 2022" }),
  series({ slug: "mindhunter", title: "Mindhunter", type: "show", bannerKey: "mindhunter", accent: nextAccent(), genreLabels: ["crime", "psychological", "drama"], languages: ["english"], rating: 8.6, year: 2017, studio: "Denver and Delilah Productions", director: "David Fincher", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 8.6, description: "FBI agents interview imprisoned serial killers to understand criminal psychology and improve profiling techniques.", synopsis: "Mindhunter explores the birth of behavioral science at the FBI through interviews with Ed Kemper and other killers." }, { seasonCount: 2, episodeCount: 19, airedFrom: "Oct 2017", airedTo: "Aug 2019" }),
  series({ slug: "true-beauty", title: "True Beauty", nativeTitle: "여신강림", type: "show", bannerKey: "true-beauty", accent: nextAccent(), genreLabels: ["romance", "comedy", "drama"], languages: ["korean", "english"], rating: 7.9, year: 2020, studio: "Studio Dragon", director: "Kim Soo-jung", network: "tvN", country: "South Korea", ageRating: "13+", imdbRating: 7.9, description: "Im Ju-kyung masters makeup to hide her insecurities at school, juggling two suitors who know different versions of her.", synopsis: "True Beauty adapts the webtoon about self-esteem, romance, and the pressure to appear perfect." }, { seasonCount: 1, episodeCount: 16, airedFrom: "Dec 2020", airedTo: "Feb 2021" }),
  series({ slug: "delhi-crime", title: "Delhi Crime", type: "show", bannerKey: "delhi-crime", accent: nextAccent(), genreLabels: ["crime", "drama", "thriller"], languages: ["hindi", "english"], rating: 8.5, year: 2019, studio: "Golden Karat Films", director: "Richie Mehta", network: "Netflix", country: "India", ageRating: "18+", imdbRating: 8.5, description: "Delhi Police investigate the 2012 Nirbhaya case in a gripping procedural led by DCP Vartika Chaturvedi.", synopsis: "Delhi Crime follows investigators under public pressure as they hunt perpetrators across India." }, { seasonCount: 2, episodeCount: 14, airedFrom: "Mar 2019", airedTo: "Aug 2022" }),
  series({ slug: "the-night-agent", title: "The Night Agent", type: "show", bannerKey: "the-night-agent", accent: nextAccent(), genreLabels: ["thriller", "action", "mystery"], languages: ["english"], rating: 7.6, year: 2023, studio: "Sony Pictures Television", director: "Seth Gordon", network: "Netflix", country: "USA", ageRating: "16+", imdbRating: 7.6, description: "Low-level FBI agent Peter Sutherland answers a crisis line and is thrust into a conspiracy reaching the White House.", synopsis: "The Night Agent pairs Peter with Rose Larkin as they decode who to trust while thwarting an assassination plot." }, { seasonCount: 1, episodeCount: 10, airedFrom: "Mar 2023", airedTo: "Present" }),
  series({ slug: "arcane", title: "Arcane", type: "show", bannerKey: "arcane", accent: nextAccent(), genreLabels: ["action", "fantasy", "drama"], languages: ["english"], rating: 9.0, year: 2021, studio: "Fortiche Production", director: "Pascal Charrue", network: "Netflix", country: "France", ageRating: "16+", imdbRating: 9.0, description: "Sisters Vi and Jinx are torn apart on opposite sides of class war between utopian Piltover and underground Zaun.", synopsis: "Arcane expands League of Legends lore with stylized animation and a tragic rivalry at its heart." }, { seasonCount: 2, episodeCount: 18, airedFrom: "Nov 2021", airedTo: "Present" }),
  series({ slug: "the-last-of-us", title: "The Last of Us", type: "show", bannerKey: "the-last-of-us", accent: nextAccent(), genreLabels: ["drama", "sci-fi", "thriller"], languages: ["english"], rating: 8.8, year: 2023, studio: "HBO", director: "Craig Mazin", network: "HBO", country: "USA", ageRating: "18+", imdbRating: 8.8, description: "Twenty years after a fungal pandemic, Joel escorts immune teenager Ellie across a collapsed United States.", synopsis: "The Last of Us adapts Naughty Dog's game into a harrowing road story about survival, grief, and found family." }, { seasonCount: 1, episodeCount: 9, airedFrom: "Jan 2023", airedTo: "Present" }),
  series({ slug: "sex-life", title: "Sex/Life", type: "show", bannerKey: "sex-life", accent: nextAccent(), genreLabels: ["drama", "romance", "comedy"], languages: ["english"], rating: 5.5, year: 2021, studio: "Stiletto Entertainment", director: "Patricia Rosanne", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 5.5, description: "Suburban mother Billie Connelly revisits the passionate past with ex Brad while married to Cooper.", synopsis: "Sex/Life explores desire and nostalgia as Billie journals her fantasies and questions her marriage." }, { seasonCount: 2, episodeCount: 14, airedFrom: "Jun 2021", airedTo: "Mar 2023" }),
  series({ slug: "sacred-games", title: "Sacred Games", type: "show", bannerKey: "sacred-games", accent: nextAccent(), genreLabels: ["crime", "thriller", "drama"], languages: ["hindi", "english"], rating: 8.6, year: 2018, studio: "Phantom Films", director: "Anurag Kashyap", network: "Netflix", country: "India", ageRating: "18+", imdbRating: 8.6, description: "Mumbai cop Sartaj Singh receives a cryptic warning from gangster Ganesh Gaitonde about an attack on the city.", synopsis: "Sacred Games weaves police procedural and gangland epic across decades of Indian politics and crime." }, { seasonCount: 2, episodeCount: 16, airedFrom: "Jul 2018", airedTo: "Aug 2019" }),
  series({ slug: "narcos", title: "Narcos", type: "show", bannerKey: "narcos", accent: nextAccent(), genreLabels: ["crime", "drama", "thriller"], languages: ["spanish", "english"], rating: 8.8, year: 2015, studio: "Gaumont International Television", director: "Chris Brancato", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 8.8, description: "DEA agents pursue Pablo Escobar and later cartel leaders in Colombia and Mexico.", synopsis: "Narcos dramatizes the war on drugs through Escobar's rise and fall and the agents hunting him." }, { seasonCount: 3, episodeCount: 30, airedFrom: "Aug 2015", airedTo: "Sep 2017" }),
  series({ slug: "never-have-i-ever", title: "Never Have I Ever", type: "show", bannerKey: "never-have-i-ever", accent: nextAccent(), genreLabels: ["comedy", "drama", "romance"], languages: ["english"], rating: 7.9, year: 2020, studio: "Kaling International", director: "Mindy Kaling", network: "Netflix", country: "USA", ageRating: "13+", imdbRating: 7.9, description: "Indian-American teen Devi Vishwakumar navigates high school grief, crushes, and cultural expectations.", synopsis: "Never Have I Ever balances coming-of-age comedy with Devi rebuilding life after her father's death." }, { seasonCount: 4, episodeCount: 40, airedFrom: "Apr 2020", airedTo: "Jun 2023" }),
  series({ slug: "a-good-girls-guide-to-murder", title: "A Good Girl's Guide to Murder", type: "show", bannerKey: "a-good-girls-guide-to-murder", accent: nextAccent(), genreLabels: ["mystery", "drama", "thriller"], languages: ["english"], rating: 7.4, year: 2024, studio: "Moonage Pictures", director: "Dolly Wells", network: "Netflix", country: "UK", ageRating: "13+", imdbRating: 7.4, description: "Teen Pip Fitz-Amobi reinvestigates a closed murder case for her school project and uncovers new suspects.", synopsis: "A Good Girl's Guide to Murder adapts Holly Jackson's novel about amateur sleuthing in a small town." }, { seasonCount: 1, episodeCount: 6, airedFrom: "Aug 2024", airedTo: "Present" }),
  series({ slug: "caliphate", title: "Caliphate", nativeTitle: "Kalifat", type: "show", bannerKey: "caliphate", accent: nextAccent(), genreLabels: ["thriller", "drama", "action"], languages: ["english", "german"], rating: 7.5, year: 2020, studio: "Filmlance International", director: "Göran Olsson", network: "Netflix", country: "Sweden", ageRating: "16+", imdbRating: 7.5, description: "A Swedish agent and a young woman in Syria converge as an ISIS caliphate plot threatens Europe.", synopsis: "Caliphate follows parallel storylines of radicalization and counterterrorism across Sweden and Syria." }, { seasonCount: 1, episodeCount: 8, airedFrom: "Mar 2020", airedTo: "Mar 2020" }),
  series({ slug: "love-101", title: "Love 101", nativeTitle: "Aşk 101", type: "show", bannerKey: "love-101", accent: nextAccent(), genreLabels: ["romance", "comedy", "drama"], languages: ["english"], rating: 7.4, year: 2020, studio: "OGM Pictures", director: "Umut Arac", network: "Netflix", country: "Turkey", ageRating: "13+", imdbRating: 7.4, description: "Four misfit students in 1990s Turkey try to help their teacher find love so she won't leave their school.", synopsis: "Love 101 is a nostalgic teen dramedy about friendship, first crushes, and schemes to keep their favorite teacher." }, { seasonCount: 2, episodeCount: 16, airedFrom: "Mar 2020", airedTo: "Jun 2021" }),
  series({ slug: "emily-in-paris", title: "Emily in Paris", type: "show", bannerKey: "emily-in-paris", accent: nextAccent(), genreLabels: ["comedy", "romance", "drama"], languages: ["english", "french"], rating: 6.8, year: 2020, studio: "MTV Entertainment Studios", director: "Darren Star", network: "Netflix", country: "USA", ageRating: "13+", imdbRating: 6.8, description: "Chicago marketing executive Emily Cooper moves to Paris for work, navigating culture clashes and complicated romance.", synopsis: "Emily in Paris follows Emily's glamorous misadventures in fashion, friendship, and love in the French capital." }, { seasonCount: 4, episodeCount: 40, airedFrom: "Oct 2020", airedTo: "Present" }),
];

const DOCUMENTARIES: CuratedDraft[] = [
  doc({ slug: "planet-earth", title: "Planet Earth", type: "documentary", bannerKey: "planet-earth", accent: nextAccent(), genreLabels: ["drama", "adventure", "mystery"], languages: ["english"], rating: 9.4, year: 2006, studio: "BBC Natural History Unit", director: "Alastair Fothergill", network: "BBC", country: "UK", ageRating: "All", imdbRating: 9.4, description: "Landmark BBC series showcasing Earth's most extraordinary habitats and wildlife with groundbreaking HD footage.", synopsis: "Planet Earth journeys from polar ice to tropical rainforests, revealing rare animal behavior across eleven episodes." }, "8h 30m"),
  doc({ slug: "planet-earth-ii", title: "Planet Earth II", type: "documentary", bannerKey: "planet-earth", accent: nextAccent(), genreLabels: ["drama", "adventure", "mystery"], languages: ["english"], rating: 9.5, year: 2016, studio: "BBC Natural History Unit", director: "Elizabeth White", network: "BBC", country: "UK", ageRating: "All", imdbRating: 9.5, description: "A decade later, advanced camera technology captures cities, islands, and deserts through intimate wildlife stories.", synopsis: "Planet Earth II revisits global ecosystems with episodes devoted to islands, mountains, jungles, and urban wildlife." }, "6h"),
  doc({ slug: "planet-earth-iii", title: "Planet Earth III", type: "documentary", bannerKey: "planet-earth", accent: nextAccent(), genreLabels: ["drama", "adventure", "mystery"], languages: ["english"], rating: 9.2, year: 2023, studio: "BBC Studios Natural History Unit", director: "Mike Gunton", network: "BBC", country: "UK", ageRating: "All", imdbRating: 9.2, description: "Sir David Attenborough narrates new stories of resilience as animals adapt to a rapidly changing planet.", synopsis: "Planet Earth III highlights species fighting for survival amid climate pressure and human encroachment." }, "8h"),
  doc({ slug: "captains-of-the-world", title: "Captains of the World", type: "documentary", bannerKey: "captains-of-the-world", accent: nextAccent(), genreLabels: ["sports", "drama", "action"], languages: ["spanish", "english"], rating: 7.8, year: 2023, studio: "Netflix", director: "Various", network: "Netflix", country: "Argentina", ageRating: "13+", imdbRating: 7.8, description: "Six-part docuseries following Lionel Messi and Argentina through the emotional 2022 FIFA World Cup campaign.", synopsis: "Captains of the World offers locker-room access to Argentina's road to winning the World Cup in Qatar." }, "4h 30m"),
  doc({ slug: "jeffrey-epstein-filthy-rich", title: "Jeffrey Epstein: Filthy Rich", type: "documentary", bannerKey: "jeffrey-epstein-filthy-rich", accent: nextAccent(), genreLabels: ["crime", "mystery", "drama"], languages: ["english"], rating: 7.0, year: 2020, studio: "RadicalMedia", director: "Lisa Bryant", network: "Netflix", country: "USA", ageRating: "18+", imdbRating: 7.0, description: "Survivors recount how financier Jeffrey Epstein built a trafficking network shielded by wealth and powerful connections.", synopsis: "Filthy Rich uses victim testimony and archival footage to expose Epstein's crimes and the system that enabled him." }, "4h"),
];

const MOVIES: CuratedDraft[] = [
  ...franchise("avengers", [
    { slug: "the-avengers", title: "The Avengers", genreLabels: ["action", "sci-fi", "fantasy"], accent: nextAccent(), rating: 8.0, year: 2012, studio: "Marvel Studios", director: "Joss Whedon", country: "USA", imdbRating: 8.0, runtime: "2h 23m", description: "Earth's mightiest heroes assemble to stop Loki and an alien invasion of New York.", synopsis: "Iron Man, Captain America, Thor, Hulk, Black Widow, and Hawkeye unite as the Avengers for the first time." },
    { slug: "avengers-age-of-ultron", title: "Avengers: Age of Ultron", genreLabels: ["action", "sci-fi", "fantasy"], accent: nextAccent(), rating: 7.3, year: 2015, studio: "Marvel Studios", director: "Joss Whedon", country: "USA", imdbRating: 7.3, runtime: "2h 21m", description: "The team faces Ultron, an AI determined to eradicate humanity, while new heroes emerge.", synopsis: "Age of Ultron tests the Avengers' unity as Tony Stark's creation turns against the world." },
    { slug: "avengers-infinity-war", title: "Avengers: Infinity War", genreLabels: ["action", "sci-fi", "fantasy"], accent: nextAccent(), rating: 8.4, year: 2018, studio: "Marvel Studios", director: "Anthony & Joe Russo", country: "USA", imdbRating: 8.4, runtime: "2h 29m", description: "Thanos collects the Infinity Stones while heroes across the universe try to stop universal genocide.", synopsis: "Infinity War brings dozens of MCU heroes together in a devastating battle against Thanos." },
    { slug: "avengers-endgame", title: "Avengers: Endgame", genreLabels: ["action", "sci-fi", "drama"], accent: nextAccent(), rating: 8.4, year: 2019, studio: "Marvel Studios", director: "Anthony & Joe Russo", country: "USA", imdbRating: 8.4, runtime: "3h 1m", description: "Survivors of the Snap embark on a time-heist to undo Thanos and restore the universe.", synopsis: "Endgame concludes the Infinity Saga with sacrifice, time travel, and an epic final stand." },
  ]),
  ...franchise("spider-man", [
    { slug: "spider-man-2002", title: "Spider-Man", genreLabels: ["action", "sci-fi", "romance"], accent: nextAccent(), rating: 7.4, year: 2002, studio: "Columbia Pictures", director: "Sam Raimi", country: "USA", imdbRating: 7.4, runtime: "2h 1m", description: "Peter Parker gains spider powers and faces the Green Goblin in New York.", synopsis: "Sam Raimi's Spider-Man launches the modern superhero era with Peter's origin and responsibility mantra." },
    { slug: "spider-man-2", title: "Spider-Man 2", genreLabels: ["action", "sci-fi", "drama"], accent: nextAccent(), rating: 7.5, year: 2004, studio: "Columbia Pictures", director: "Sam Raimi", country: "USA", imdbRating: 7.5, runtime: "2h 7m", description: "Peter struggles to balance life and heroism while Doctor Octopus threatens the city.", synopsis: "Spider-Man 2 deepens Peter's burden as Doc Ock's mechanical arms wreak havoc." },
    { slug: "spider-man-3", title: "Spider-Man 3", genreLabels: ["action", "sci-fi", "romance"], accent: nextAccent(), rating: 6.3, year: 2007, studio: "Columbia Pictures", director: "Sam Raimi", country: "USA", imdbRating: 6.3, runtime: "2h 19m", description: "A symbiote suit amplifies Peter's aggression as Sandman and Venom emerge.", synopsis: "Spider-Man 3 pushes Peter toward darkness before he rejects the symbiote's influence." },
    { slug: "the-amazing-spider-man", title: "The Amazing Spider-Man", genreLabels: ["action", "sci-fi", "romance"], accent: nextAccent(), rating: 6.9, year: 2012, studio: "Columbia Pictures", director: "Marc Webb", country: "USA", imdbRating: 6.9, runtime: "2h 16m", description: "Peter retraces his parents' secrets and battles the Lizard in a rebooted origin.", synopsis: "The Amazing Spider-Man revisits Gwen Stacy, Oscorp experiments, and Peter's early days." },
    { slug: "the-amazing-spider-man-2", title: "The Amazing Spider-Man 2", genreLabels: ["action", "sci-fi", "romance"], accent: nextAccent(), rating: 6.6, year: 2014, studio: "Columbia Pictures", director: "Marc Webb", country: "USA", imdbRating: 6.6, runtime: "2h 22m", description: "Electro and Green Goblin threaten Peter as he tries to protect Gwen.", synopsis: "The Amazing Spider-Man 2 escalates villain chaos and tragedy in Peter's dual life." },
    { slug: "spider-man-homecoming", title: "Spider-Man: Homecoming", genreLabels: ["action", "sci-fi", "comedy"], accent: nextAccent(), rating: 7.4, year: 2017, studio: "Marvel Studios", director: "Jon Watts", country: "USA", imdbRating: 7.4, runtime: "2h 13m", description: "Teen Peter Parker balances high school with mentorship from Tony Stark while facing the Vulture.", synopsis: "Homecoming brings Spider-Man into the MCU with a grounded coming-of-age tone." },
    { slug: "spider-man-far-from-home", title: "Spider-Man: Far From Home", genreLabels: ["action", "sci-fi", "comedy"], accent: nextAccent(), rating: 7.4, year: 2019, studio: "Marvel Studios", director: "Jon Watts", country: "USA", imdbRating: 7.4, runtime: "2h 9m", description: "On a European trip, Peter encounters Mysterio's illusions and questions his place among heroes.", synopsis: "Far From Home explores grief after Endgame and a deceptive new ally." },
    { slug: "spider-man-no-way-home", title: "Spider-Man: No Way Home", genreLabels: ["action", "sci-fi", "drama"], accent: nextAccent(), rating: 8.2, year: 2021, studio: "Marvel Studios", director: "Jon Watts", country: "USA", imdbRating: 8.2, runtime: "2h 28m", description: "A spell gone wrong opens the multiverse, bringing past Spider-Man villains to the MCU.", synopsis: "No Way Home unites multiple Spider-Men in a fan-service epic about sacrifice and identity." },
  ]),
  ...franchise("batman", [
    { slug: "batman-begins", title: "Batman Begins", genreLabels: ["action", "drama", "thriller"], accent: nextAccent(), rating: 8.2, year: 2005, studio: "Warner Bros.", director: "Christopher Nolan", country: "USA", imdbRating: 8.2, runtime: "2h 20m", description: "Bruce Wayne trains with the League of Shadows before returning to Gotham as Batman.", synopsis: "Batman Begins grounds the Dark Knight in realism, fear tactics, and moral choice." },
    { slug: "the-dark-knight", title: "The Dark Knight", genreLabels: ["action", "drama", "thriller"], accent: nextAccent(), rating: 9.0, year: 2008, studio: "Warner Bros.", director: "Christopher Nolan", country: "USA", imdbRating: 9.0, runtime: "2h 32m", description: "Batman faces the Joker's chaos as Gotham's soul hangs in the balance.", synopsis: "The Dark Knight is a crime epic about escalation, surveillance, and the cost of heroism." },
    { slug: "the-dark-knight-rises", title: "The Dark Knight Rises", genreLabels: ["action", "drama", "thriller"], accent: nextAccent(), rating: 8.4, year: 2012, studio: "Warner Bros.", director: "Christopher Nolan", country: "USA", imdbRating: 8.4, runtime: "2h 44m", description: "Broken and exiled, Bruce Wayne must rise against Bane's siege of Gotham.", synopsis: "The Dark Knight Rises closes Nolan's trilogy with revolution, redemption, and legacy." },
  ]),
  movie({ slug: "the-trial-of-the-chicago-7", title: "The Trial of the Chicago 7", type: "movie", bannerKey: "the-trial-of-the-chicago-7", accent: nextAccent(), genreLabels: ["drama", "thriller", "crime"], languages: ["english"], rating: 7.7, year: 2020, studio: "Cross Creek Pictures", director: "Aaron Sorkin", country: "USA", ageRating: "16+", imdbRating: 7.7, description: "Seven defendants stand trial after protests at the 1968 Democratic National Convention.", synopsis: "Aaron Sorkin's courtroom drama chronicles political protest, police violence, and judicial bias." }, "2h 10m"),
  movie({ slug: "bird-box", title: "Bird Box", type: "movie", bannerKey: "bird-box", accent: nextAccent(), genreLabels: ["thriller", "sci-fi", "drama"], languages: ["english"], rating: 6.6, year: 2018, studio: "Bluegrass Films", director: "Susanne Bier", country: "USA", ageRating: "16+", imdbRating: 6.6, description: "Malorie must ferry two children down a river blindfolded to escape entities that drive people to suicide.", synopsis: "Bird Box follows a mother navigating unseen horrors in a post-apocalyptic survival journey." }, "2h 4m"),
  movie({ slug: "the-irishman", title: "The Irishman", type: "movie", bannerKey: "the-irishman", accent: nextAccent(), genreLabels: ["crime", "drama", "thriller"], languages: ["english"], rating: 7.8, year: 2019, studio: "Tribeca Productions", director: "Martin Scorsese", country: "USA", ageRating: "18+", imdbRating: 7.8, description: "Hitman Frank Sheeran reflects on his friendship with Jimmy Hoffa and life in the Bufalino crime family.", synopsis: "The Irishman spans decades of organized labor, mob politics, and regret through de-aged performances." }, "3h 29m"),
  movie({ slug: "365-days", title: "365 Days", nativeTitle: "365 Dni", type: "movie", bannerKey: "365-days", accent: nextAccent(), genreLabels: ["romance", "drama", "thriller"], languages: ["english"], rating: 3.3, year: 2020, studio: "Ekipa", director: "Barbara Bialowas", country: "Poland", ageRating: "18+", imdbRating: 3.3, description: "Laura is imprisoned by Sicilian mafia boss Massimo, who gives her 365 days to fall in love with him.", synopsis: "365 Days became a global streaming phenomenon for its provocative romantic tension." }, "1h 54m"),
  ...franchise("fifty-shades-of-grey", [
    { slug: "fifty-shades-of-grey", title: "Fifty Shades of Grey", genreLabels: ["romance", "drama", "thriller"], accent: nextAccent(), rating: 4.2, year: 2015, studio: "Universal Pictures", director: "Sam Taylor-Johnson", country: "USA", imdbRating: 4.2, runtime: "2h 5m", description: "Literature student Anastasia Steele enters a contract relationship with billionaire Christian Grey.", synopsis: "Fifty Shades of Grey adapts E.L. James's novel about desire, control, and boundaries." },
    { slug: "fifty-shades-darker", title: "Fifty Shades Darker", genreLabels: ["romance", "drama", "thriller"], accent: nextAccent(), rating: 4.9, year: 2017, studio: "Universal Pictures", director: "James Foley", country: "USA", imdbRating: 4.9, runtime: "1h 58m", description: "Ana and Christian reunite while facing threats from Christian's past.", synopsis: "Fifty Shades Darker deepens their relationship amid stalkers and old flames." },
    { slug: "fifty-shades-freed", title: "Fifty Shades Freed", genreLabels: ["romance", "drama", "thriller"], accent: nextAccent(), rating: 4.5, year: 2018, studio: "Universal Pictures", director: "James Foley", country: "USA", imdbRating: 4.5, runtime: "1h 45m", description: "Newlyweds Ana and Christian face external enemies targeting their life together.", synopsis: "Fifty Shades Freed concludes the trilogy with marriage, danger, and reconciliation." },
  ]),
  ...franchise("after", [
    { slug: "after", title: "After", genreLabels: ["romance", "drama", "comedy"], accent: nextAccent(), rating: 5.3, year: 2019, studio: "CalMaple Media", director: "Jenny Gage", country: "USA", imdbRating: 5.3, runtime: "1h 45m", description: "Innocent Tessa Young falls for brooding Hardin Scott at college.", synopsis: "After adapts Anna Todd's Wattpad novel about first love and toxic attraction." },
    { slug: "after-we-collided", title: "After We Collided", genreLabels: ["romance", "drama", "comedy"], accent: nextAccent(), rating: 5.0, year: 2020, studio: "CalMaple Media", director: "Roger Kumble", country: "USA", imdbRating: 5.0, runtime: "1h 45m", description: "Tessa and Hardin struggle to rebuild trust after betrayal.", synopsis: "After We Collided pushes their relationship through jealousy, family secrets, and relapse." },
    { slug: "after-we-fell", title: "After We Fell", genreLabels: ["romance", "drama", "comedy"], accent: nextAccent(), rating: 4.8, year: 2021, studio: "CalMaple Media", director: "Castille Landon", country: "USA", imdbRating: 4.8, runtime: "1h 38m", description: "Parental drama and career moves test Tessa and Hardin's commitment.", synopsis: "After We Fell explores how past trauma shapes their future together." },
    { slug: "after-ever-happy", title: "After Ever Happy", genreLabels: ["romance", "drama", "comedy"], accent: nextAccent(), rating: 4.7, year: 2022, studio: "CalMaple Media", director: "Castille Landon", country: "USA", imdbRating: 4.7, runtime: "1h 35m", description: "A revelation about Hardin's father sends the couple into crisis.", synopsis: "After Ever Happy confronts forgiveness as Tessa and Hardin face life-changing news." },
    { slug: "after-everything", title: "After Everything", genreLabels: ["romance", "drama", "comedy"], accent: nextAccent(), rating: 4.8, year: 2023, studio: "CalMaple Media", director: "Castille Landon", country: "USA", imdbRating: 4.8, runtime: "1h 33m", description: "Hardin travels to reconcile with his mother while Tessa focuses on her career.", synopsis: "After Everything expands Hardin's backstory ahead of the series finale." },
  ]),
  movie({ slug: "my-fault", title: "My Fault", nativeTitle: "Culpa mía", type: "movie", bannerKey: "my-fault", accent: nextAccent(), genreLabels: ["romance", "drama", "thriller"], languages: ["spanish", "english"], rating: 5.6, year: 2023, studio: "Pokeepsie Films", director: "Domingo González", country: "Spain", ageRating: "18+", imdbRating: 5.6, description: "Noah moves in with wealthy William Leister and falls for his rebellious son Nick.", synopsis: "My Fault blends romance and street-racing adrenaline in Amazon's hit Spanish teen drama." }, "1h 57m"),
  movie({ slug: "your-fault", title: "Your Fault", nativeTitle: "Culpa tuya", type: "movie", bannerKey: "your-fault", accent: nextAccent(), genreLabels: ["romance", "drama", "thriller"], languages: ["spanish", "english"], rating: 5.4, year: 2024, studio: "Pokeepsie Films", director: "Domingo González", country: "Spain", ageRating: "18+", imdbRating: 5.4, description: "Noah and Nick's relationship faces jealousy, family interference, and public scrutiny.", synopsis: "Your Fault continues Noah and Nick's turbulent love story after the events of My Fault." }, "1h 58m"),
  ...franchise("blade-runner", [
    { slug: "blade-runner", title: "Blade Runner", genreLabels: ["sci-fi", "thriller", "mystery"], accent: nextAccent(), rating: 8.1, year: 1982, studio: "Warner Bros.", director: "Ridley Scott", country: "USA", imdbRating: 8.1, runtime: "1h 57m", description: "Deckard hunts bioengineered replicants in dystopian Los Angeles.", synopsis: "Blade Runner defined neo-noir sci-fi with questions of memory, humanity, and identity." },
    { slug: "blade-runner-2049", title: "Blade Runner 2049", genreLabels: ["sci-fi", "thriller", "mystery"], accent: nextAccent(), rating: 8.0, year: 2017, studio: "Warner Bros.", director: "Denis Villeneuve", country: "USA", imdbRating: 8.0, runtime: "2h 44m", description: "Officer K uncovers a secret that could destabilize society and reunites with Rick Deckard.", synopsis: "Blade Runner 2049 expands the original's mythology with stunning visuals and existential dread." },
  ]),
  ...franchise("fast-and-furious", [
    { slug: "the-fast-and-the-furious", title: "The Fast and the Furious", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 6.8, year: 2001, studio: "Universal Pictures", director: "Rob Cohen", country: "USA", imdbRating: 6.8, runtime: "1h 46m", description: "Undercover cop Brian O'Conner infiltrates LA street racer Dominic Toretto's crew.", synopsis: "The franchise begins with nitro-fueled loyalty and undercover tension." },
    { slug: "2-fast-2-furious", title: "2 Fast 2 Furious", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 5.9, year: 2003, studio: "Universal Pictures", director: "John Singleton", country: "USA", imdbRating: 5.9, runtime: "1h 47m", description: "Brian teams with Roman Pearce to take down a Miami drug lord.", synopsis: "2 Fast 2 Furious moves the action to Miami with exotic cars and federal pressure." },
    { slug: "the-fast-and-the-furious-tokyo-drift", title: "The Fast and the Furious: Tokyo Drift", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 6.1, year: 2006, studio: "Universal Pictures", director: "Justin Lin", country: "USA", imdbRating: 6.1, runtime: "1h 44m", description: "Sean Boswell learns drift racing in Tokyo's underground scene.", synopsis: "Tokyo Drift introduces Han and Japanese mountain racing culture to the saga." },
    { slug: "fast-and-furious-2009", title: "Fast & Furious", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 6.5, year: 2009, studio: "Universal Pictures", director: "Justin Lin", country: "USA", imdbRating: 6.5, runtime: "1h 47m", description: "Dom and Brian reunite to avenge Letty and take down a drug cartel.", synopsis: "The fourth film reconnects the original cast and pivots toward heist-scale action." },
    { slug: "fast-five", title: "Fast Five", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 7.3, year: 2011, studio: "Universal Pictures", director: "Justin Lin", country: "USA", imdbRating: 7.3, runtime: "2h 10m", description: "The crew pulls a vault heist in Rio while dodging agent Hobbs.", synopsis: "Fast Five reinvented the series as a blockbuster heist ensemble." },
    { slug: "fast-and-furious-6", title: "Fast & Furious 6", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 7.0, year: 2013, studio: "Universal Pictures", director: "Justin Lin", country: "USA", imdbRating: 7.0, runtime: "2h 10m", description: "Dom's team hunts mercenary Shaw to earn pardons and rescue Letty.", synopsis: "Fast & Furious 6 delivers tank chases and runway battles with found-family stakes." },
    { slug: "furious-7", title: "Furious 7", genreLabels: ["action", "crime", "drama"], accent: nextAccent(), rating: 7.1, year: 2015, studio: "Universal Pictures", director: "James Wan", country: "USA", imdbRating: 7.1, runtime: "2h 17m", description: "Shaw's brother seeks revenge while the team chases a hacking program called God's Eye.", synopsis: "Furious 7 honors Paul Walker amid skyscraper jumps and emotional farewell." },
    { slug: "the-fate-of-the-furious", title: "The Fate of the Furious", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 6.6, year: 2017, studio: "Universal Pictures", director: "F. Gary Gray", country: "USA", imdbRating: 6.6, runtime: "2h 16m", description: "Dom turns against his family under cyberterrorist Cipher's control.", synopsis: "The Fate of the Furious pits submarine warfare against family loyalty." },
    { slug: "f9", title: "F9", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 5.2, year: 2021, studio: "Universal Pictures", director: "Justin Lin", country: "USA", imdbRating: 5.2, runtime: "2h 25m", description: "Dom faces his estranged brother Jakob tied to their father's death.", synopsis: "F9 launches cars into space while exploring Toretto family history." },
    { slug: "fast-x", title: "Fast X", genreLabels: ["action", "crime", "thriller"], accent: nextAccent(), rating: 5.8, year: 2023, studio: "Universal Pictures", director: "Louis Leterrier", country: "USA", imdbRating: 5.8, runtime: "2h 21m", description: "Dante Reyes targets Dom's family to avenge his father's downfall.", synopsis: "Fast X raises the stakes with globe-trotting vengeance and a cliffhanger ending." },
  ]),
  ...franchise("the-matrix", [
    { slug: "the-matrix", title: "The Matrix", genreLabels: ["sci-fi", "action", "thriller"], accent: nextAccent(), rating: 8.7, year: 1999, studio: "Warner Bros.", director: "Lana & Lilly Wachowski", country: "USA", imdbRating: 8.7, runtime: "2h 16m", description: "Neo learns reality is a simulation and joins rebels fighting machine overlords.", synopsis: "The Matrix revolutionized action cinema with bullet time and philosophical cyberpunk." },
    { slug: "the-matrix-reloaded", title: "The Matrix Reloaded", genreLabels: ["sci-fi", "action", "thriller"], accent: nextAccent(), rating: 7.2, year: 2003, studio: "Warner Bros.", director: "Lana & Lilly Wachowski", country: "USA", imdbRating: 7.2, runtime: "2h 18m", description: "Neo confronts the Architect while Zion prepares for machine invasion.", synopsis: "Reloaded expands the mythology with highway chases and prophecy twists." },
    { slug: "the-matrix-revolutions", title: "The Matrix Revolutions", genreLabels: ["sci-fi", "action", "thriller"], accent: nextAccent(), rating: 6.7, year: 2003, studio: "Warner Bros.", director: "Lana & Lilly Wachowski", country: "USA", imdbRating: 6.7, runtime: "2h 9m", description: "Humanity's last stand in Zion coincides with Neo's journey to the Machine City.", synopsis: "Revolutions concludes the original trilogy with sacrificial peace." },
    { slug: "the-matrix-resurrections", title: "The Matrix Resurrections", genreLabels: ["sci-fi", "action", "romance"], accent: nextAccent(), rating: 5.7, year: 2021, studio: "Warner Bros.", director: "Lana Wachowski", country: "USA", imdbRating: 5.7, runtime: "2h 28m", description: "Neo rediscovers the Matrix decades later with altered memories and new threats.", synopsis: "Resurrections revisits Neo and Trinity in a meta sequel about legacy franchises." },
  ]),
  movie({ slug: "inception", title: "Inception", type: "movie", bannerKey: "inception", accent: nextAccent(), genreLabels: ["sci-fi", "action", "thriller"], languages: ["english"], rating: 8.8, year: 2010, studio: "Warner Bros.", director: "Christopher Nolan", country: "USA", ageRating: "13+", imdbRating: 8.8, description: "Thief Dom Cobb plants an idea inside a CEO's mind through layered shared dreams.", synopsis: "Inception blends heist structure with dream architecture and an iconic spinning top ending." }, "2h 28m"),
  movie({ slug: "interstellar", title: "Interstellar", type: "movie", bannerKey: "interstellar", accent: nextAccent(), genreLabels: ["sci-fi", "drama", "adventure"], languages: ["english"], rating: 8.7, year: 2014, studio: "Paramount Pictures", director: "Christopher Nolan", country: "USA", ageRating: "13+", imdbRating: 8.7, description: "Cooper travels through a wormhole to find a new home for humanity as Earth dies.", synopsis: "Interstellar pairs cosmic spectacle with a father-daughter story about love transcending dimensions." }, "2h 49m"),
  movie({ slug: "train-to-busan", title: "Train to Busan", nativeTitle: "부산행", type: "movie", bannerKey: "train-to-busan", accent: nextAccent(), genreLabels: ["action", "thriller", "drama"], languages: ["korean", "english"], rating: 7.6, year: 2016, studio: "Next Entertainment World", director: "Yeon Sang-ho", country: "South Korea", ageRating: "16+", imdbRating: 7.6, description: "Passengers fight zombies aboard a KTX train headed to Busan during a sudden outbreak.", synopsis: "Train to Busan delivers relentless tension and emotional sacrifice in a confined setting." }, "1h 58m"),
  movie({ slug: "parasite", title: "Parasite", nativeTitle: "기생충", type: "movie", bannerKey: "parasite", accent: nextAccent(), genreLabels: ["thriller", "drama", "comedy"], languages: ["korean", "english"], rating: 8.5, year: 2019, studio: "Barunson E&A", director: "Bong Joon-ho", country: "South Korea", ageRating: "16+", imdbRating: 8.5, description: "The impoverished Kim family infiltrates the wealthy Park household with escalating consequences.", synopsis: "Parasite is a class satire that won the Palme d'Or and Best Picture at the Oscars." }, "2h 12m"),
];

export function generateCuratedContentItems(): ContentSeedBase[] {
  return applyImages([...ANIME, ...SHOWS, ...DOCUMENTARIES, ...MOVIES]);
}

export const CURATED_CONTENT_COUNT = ANIME.length + SHOWS.length + DOCUMENTARIES.length + MOVIES.length;
