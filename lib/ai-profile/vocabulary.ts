/**
 * Fixed vocabularies for AI mode (quiz cards, chat extraction, the AI profile
 * page). Client-safe. Every option has:
 *  - `phrase`: how it reads in the text we embed, so the recommender can match on meaning
 *  - `genres`: catalog genre ids it nudges (content) — optional
 */

export interface VocabOption {
  id: string;
  label: string;
  emoji: string;
  phrase: string;
  genres?: string[];
  /** Poster / photo for "pick what you love" cards (catalog-backed options). */
  imageUrl?: string;
}

const byId = (options: readonly VocabOption[]) => new Map(options.map((option) => [option.id, option]));

// ---- Watch mode ----------------------------------------------------------------------------

export const WATCH_VIBES: readonly VocabOption[] = [
  { id: "cozy", label: "Cozy", emoji: "🍵", phrase: "cozy, warm and comforting", genres: ["comedy", "slice-of-life", "romance"] },
  { id: "thrilling", label: "Edge-of-seat", emoji: "⚡", phrase: "tense, thrilling and gripping", genres: ["thriller", "action"] },
  { id: "emotional", label: "Emotional", emoji: "💧", phrase: "emotional, heartfelt and moving", genres: ["drama", "romance"] },
  { id: "funny", label: "Funny", emoji: "😂", phrase: "funny, light-hearted and breezy", genres: ["comedy"] },
  { id: "mind-bending", label: "Mind-bending", emoji: "🌀", phrase: "mind-bending, cerebral, twisty", genres: ["sci-fi", "psychological"] },
  { id: "dark", label: "Dark & gritty", emoji: "🖤", phrase: "dark, gritty and morally grey", genres: ["crime", "thriller", "horror"] },
  { id: "epic", label: "Epic", emoji: "🏔️", phrase: "epic, sweeping worlds and big adventures", genres: ["fantasy", "adventure", "action"] },
  { id: "romantic", label: "Romantic", emoji: "💘", phrase: "romantic, swoony love stories", genres: ["romance"] },
  { id: "atmospheric", label: "Slow & atmospheric", emoji: "🌫️", phrase: "slow, quiet, atmospheric and contemplative" },
  { id: "inspiring", label: "Inspiring", emoji: "🌅", phrase: "uplifting, inspiring, hopeful", genres: ["sports", "drama"] },
  { id: "mysterious", label: "Mysterious", emoji: "🌙", phrase: "mysterious whodunits full of secrets", genres: ["mystery", "crime"] },
  { id: "eye-opening", label: "Eye-opening", emoji: "🔭", phrase: "eye-opening, real-world, educational documentaries" },
];

export const WATCH_THEMES: readonly VocabOption[] = [
  { id: "found-family", label: "Found family", emoji: "🫂", phrase: "found family and loyal friendships" },
  { id: "coming-of-age", label: "Coming of age", emoji: "🌱", phrase: "coming of age and growing up" },
  { id: "revenge", label: "Revenge", emoji: "🗡️", phrase: "revenge and justice" },
  { id: "survival", label: "Survival", emoji: "🔥", phrase: "survival against impossible odds" },
  { id: "power", label: "Power & politics", emoji: "👑", phrase: "power struggles, politics and scheming" },
  { id: "heist", label: "Heists & cons", emoji: "💰", phrase: "heists, cons and clever plans" },
  { id: "underdog", label: "Underdogs", emoji: "🥊", phrase: "underdogs, rivalries and sports" },
  { id: "supernatural", label: "Supernatural", emoji: "👻", phrase: "supernatural powers, spirits and magic" },
  { id: "time", label: "Time & memory", emoji: "⏳", phrase: "time, memory, loss and grief" },
  { id: "love", label: "Love stories", emoji: "💞", phrase: "love stories and relationships" },
  { id: "war", label: "War & history", emoji: "🎖️", phrase: "war, history and real events" },
  { id: "everyday", label: "Everyday life", emoji: "🏡", phrase: "everyday life, slice of life" },
];

export const WATCH_AVOID: readonly VocabOption[] = [
  { id: "gore", label: "Gore", emoji: "🩸", phrase: "graphic gore and violence", genres: ["horror"] },
  { id: "horror", label: "Horror", emoji: "🧟", phrase: "horror and jump scares", genres: ["horror"] },
  { id: "sad-endings", label: "Sad endings", emoji: "😢", phrase: "tragic, depressing endings" },
  { id: "romance", label: "Heavy romance", emoji: "💔", phrase: "romance-centred plots", genres: ["romance"] },
  { id: "long-series", label: "Very long series", emoji: "📚", phrase: "very long series with hundreds of episodes" },
  { id: "slow-burn", label: "Slow burns", emoji: "🐢", phrase: "slow-burn pacing" },
];

export const WATCH_FORMATS: readonly VocabOption[] = [
  { id: "anime", label: "Anime", emoji: "🌸", phrase: "anime" },
  { id: "show", label: "Shows", emoji: "📺", phrase: "TV series" },
  { id: "kdrama", label: "K-dramas", emoji: "🇰🇷", phrase: "Korean dramas" },
  { id: "movie", label: "Movies", emoji: "🎬", phrase: "films" },
  { id: "documentary", label: "Documentaries", emoji: "🔭", phrase: "documentaries" },
];

export const PACE_OPTIONS: readonly VocabOption[] = [
  { id: "slow", label: "Slow & thoughtful", emoji: "🌙", phrase: "slow, thoughtful pacing" },
  { id: "balanced", label: "Balanced", emoji: "⚖️", phrase: "balanced pacing" },
  { id: "fast", label: "Fast & bingeable", emoji: "🚀", phrase: "fast-paced and bingeable" },
];

export const COMMITMENT_OPTIONS: readonly VocabOption[] = [
  { id: "bite-size", label: "Bite-size", emoji: "🍿", phrase: "films and short series" },
  { id: "season", label: "A season or two", emoji: "📅", phrase: "short to medium series" },
  { id: "epic", label: "Long sagas", emoji: "🐉", phrase: "long-running sagas worth investing in" },
];

/** Viewer archetypes the quiz can land on — shown on the AI profile. */
export const ARCHETYPES: readonly VocabOption[] = [
  { id: "explorer", label: "The Explorer", emoji: "🧭", phrase: "loves discovering unusual, genre-hopping titles" },
  { id: "comfort", label: "The Comfort Seeker", emoji: "🛋️", phrase: "rewatches favourites and wants feel-good stories" },
  { id: "thrill", label: "The Thrill Chaser", emoji: "🎢", phrase: "wants adrenaline, twists and cliffhangers" },
  { id: "thinker", label: "The Deep Thinker", emoji: "🧠", phrase: "wants layered stories that make you think" },
  { id: "romantic", label: "The Romantic", emoji: "💌", phrase: "lives for chemistry and heartfelt relationships" },
  { id: "completionist", label: "The Completionist", emoji: "🏁", phrase: "finishes every season and loves long sagas" },
];

export const WATCH_WORLDS: readonly VocabOption[] = [
  { id: "fantasy-realm", label: "A fantasy realm", emoji: "🐉", phrase: "set in fantasy realms with magic and legends", genres: ["fantasy"] },
  { id: "near-future", label: "A tech-noir future", emoji: "🌆", phrase: "set in sci-fi futures and dystopias", genres: ["sci-fi"] },
  { id: "space", label: "Deep space", emoji: "🚀", phrase: "set in space, among stars and starships", genres: ["sci-fi"] },
  { id: "big-city", label: "A big modern city", emoji: "🏙️", phrase: "set in big modern cities" },
  { id: "small-town", label: "A quiet small town", emoji: "🏘️", phrase: "set in quiet small towns and countryside" },
  { id: "school", label: "A school or campus", emoji: "🎒", phrase: "set in schools, campuses and clubs" },
  { id: "historical", label: "The past", emoji: "🏯", phrase: "set in history — samurai, vikings, empires" },
  { id: "underworld", label: "The criminal underworld", emoji: "🕶️", phrase: "set in crime syndicates and the underworld", genres: ["crime"] },
];

export const PROTAGONISTS: readonly VocabOption[] = [
  { id: "underdog", label: "The underdog", emoji: "🌱", phrase: "an underdog lead who grows stronger" },
  { id: "anti-hero", label: "The anti-hero", emoji: "🦹", phrase: "a morally grey anti-hero lead" },
  { id: "genius", label: "The genius", emoji: "🧠", phrase: "a brilliant, strategic genius lead" },
  { id: "ensemble", label: "A tight-knit crew", emoji: "👥", phrase: "an ensemble cast with team chemistry" },
  { id: "overpowered", label: "The overpowered one", emoji: "💥", phrase: "an overpowered lead with epic power fantasies" },
  { id: "everyday", label: "A relatable everyday person", emoji: "🙂", phrase: "an ordinary, relatable lead" },
];

export const ENDING_OPTIONS: readonly VocabOption[] = [
  { id: "happy", label: "Happy & satisfying", emoji: "🌈", phrase: "satisfying, happy endings" },
  { id: "bittersweet", label: "Bittersweet", emoji: "🥀", phrase: "bittersweet endings that linger" },
  { id: "mind-blown", label: "Twist that breaks my brain", emoji: "🤯", phrase: "shocking twist endings" },
  { id: "any", label: "Don't care — the ride matters", emoji: "🎢", phrase: "any ending if the journey is great" },
];

export const INTENSITY_OPTIONS: readonly VocabOption[] = [
  { id: "light", label: "Keep it light", emoji: "☀️", phrase: "light-hearted with low intensity" },
  { id: "medium", label: "Some tension is fine", emoji: "🌤️", phrase: "moderate tension and stakes" },
  { id: "heavy", label: "Go as dark as you want", emoji: "🌑", phrase: "intense, heavy and mature themes" },
];

export const WATCH_OCCASIONS: readonly VocabOption[] = [
  { id: "late-night", label: "Late at night", emoji: "🌙", phrase: "late-night watching" },
  { id: "with-food", label: "With dinner", emoji: "🍜", phrase: "easy watching over a meal" },
  { id: "commute", label: "On the go", emoji: "🚇", phrase: "short episodes for commutes and breaks" },
  { id: "weekend-binge", label: "Weekend binge", emoji: "🛋️", phrase: "weekend binge sessions" },
  { id: "background", label: "In the background", emoji: "🎧", phrase: "something easy to follow in the background" },
];

export const COMPANY_OPTIONS: readonly VocabOption[] = [
  { id: "solo", label: "Just me", emoji: "🙋", phrase: "watching solo" },
  { id: "partner", label: "With my partner", emoji: "💑", phrase: "date-night watching with a partner" },
  { id: "friends", label: "With friends", emoji: "🍕", phrase: "group watching with friends" },
  { id: "family", label: "With family", emoji: "👨‍👩‍👧", phrase: "family-friendly watching" },
];

export const SUBS_DUBS_OPTIONS: readonly VocabOption[] = [
  { id: "subs", label: "Subtitles, always", emoji: "💬", phrase: "original audio with subtitles" },
  { id: "dubs", label: "Dubbed, please", emoji: "🎙️", phrase: "dubbed audio" },
  { id: "either", label: "Either is fine", emoji: "🤷", phrase: "subtitles or dubs" },
];

// ---- Listen mode -----------------------------------------------------------------------------

export const LISTEN_MOODS: readonly VocabOption[] = [
  { id: "hype", label: "Hype", emoji: "🔥", phrase: "high-energy hype anthems" },
  { id: "chill", label: "Chill", emoji: "🌊", phrase: "chill, mellow, relaxed" },
  { id: "focus", label: "Focus", emoji: "🎧", phrase: "focus music for studying and work" },
  { id: "workout", label: "Workout", emoji: "🏋️", phrase: "workout and running energy" },
  { id: "sad", label: "In my feels", emoji: "🌧️", phrase: "sad, emotional, melancholic songs" },
  { id: "romantic", label: "Romantic", emoji: "💗", phrase: "romantic love songs" },
  { id: "party", label: "Party", emoji: "🪩", phrase: "party and dance tracks" },
  { id: "nostalgic", label: "Nostalgic", emoji: "📼", phrase: "nostalgic throwbacks" },
  { id: "anime", label: "Anime feels", emoji: "🌸", phrase: "anime openings, endings and soundtracks" },
  { id: "sleep", label: "Wind down", emoji: "😴", phrase: "soft songs to wind down and sleep" },
];

export const ENERGY_OPTIONS: readonly VocabOption[] = [
  { id: "low", label: "Low-key", emoji: "🕯️", phrase: "soft, low-energy" },
  { id: "mid", label: "In between", emoji: "🎚️", phrase: "mid-tempo" },
  { id: "high", label: "Loud & fast", emoji: "⚡", phrase: "loud, fast, high-energy" },
];

export const DISCOVERY_OPTIONS: readonly VocabOption[] = [
  { id: "familiar", label: "My comfort zone", emoji: "🏠", phrase: "familiar favourites" },
  { id: "mix", label: "A mix", emoji: "🎲", phrase: "a mix of familiar and new" },
  { id: "new", label: "Surprise me", emoji: "🛸", phrase: "new, unexpected discoveries" },
];

export const VOCALS_OPTIONS: readonly VocabOption[] = [
  { id: "sing-along", label: "Lyrics I can sing", emoji: "🎤", phrase: "catchy vocals you can sing along to" },
  { id: "instrumental", label: "Mostly instrumental", emoji: "🎹", phrase: "instrumental, wordless music" },
  { id: "either", label: "Either", emoji: "🎶", phrase: "vocals or instrumental" },
];

export const ERA_OPTIONS: readonly VocabOption[] = [
  { id: "latest", label: "Brand-new releases", emoji: "🆕", phrase: "the latest releases" },
  { id: "2010s", label: "2010s favourites", emoji: "📱", phrase: "2010s hits" },
  { id: "2000s", label: "2000s throwbacks", emoji: "💿", phrase: "2000s throwbacks" },
  { id: "classics", label: "Timeless classics", emoji: "📻", phrase: "timeless classics" },
];

export const VOCAB = {
  worlds: byId(WATCH_WORLDS),
  protagonists: byId(PROTAGONISTS),
  ending: byId(ENDING_OPTIONS),
  intensity: byId(INTENSITY_OPTIONS),
  occasions: byId(WATCH_OCCASIONS),
  company: byId(COMPANY_OPTIONS),
  subsDubs: byId(SUBS_DUBS_OPTIONS),
  vocals: byId(VOCALS_OPTIONS),
  era: byId(ERA_OPTIONS),
  vibes: byId(WATCH_VIBES),
  themes: byId(WATCH_THEMES),
  avoid: byId(WATCH_AVOID),
  formats: byId(WATCH_FORMATS),
  pace: byId(PACE_OPTIONS),
  commitment: byId(COMMITMENT_OPTIONS),
  archetypes: byId(ARCHETYPES),
  listenMoods: byId(LISTEN_MOODS),
  energy: byId(ENERGY_OPTIONS),
  discovery: byId(DISCOVERY_OPTIONS),
};

export const vocabIds = (options: readonly VocabOption[]) => options.map((option) => option.id) as [string, ...string[]];
