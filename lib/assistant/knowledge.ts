/**
 * AniVerse help knowledge base — the documents the assistant retrieves from.
 * One article per feature, written for users. Each is embedded (kind "help") with the
 * catalog, so retrieval finds it by meaning; `keywords` back up lexical matching.
 * Keep these in sync with the product — the assistant only knows what's written here.
 */

export interface HelpArticle {
  id: string;
  title: string;
  /** Where the feature lives (used for "Open" links in answers). */
  route?: string;
  routeLabel?: string;
  keywords: string[];
  body: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "about",
    title: "What AniVerse is",
    route: "/dashboard",
    routeLabel: "Home",
    keywords: ["aniverse", "about", "what is", "overview", "features", "app"],
    body: `AniVerse is an AI-powered entertainment hub for anime, shows, K-dramas, movies, documentaries and music. You discover titles matched to your taste with a reason for every pick, plan what to watch with AI roadmaps, save favourites, a watchlist and collections, join fan communities with live watch parties, listen parties and voice talk rooms, meet people with similar taste through AI Match, message friends, and see your habits in Analytics and Wrapped. AniVerse is legal-first: it shows official trailers, 30-second song previews and "where to watch / listen" links to licensed services — it never hosts pirated video or audio, and never shows lyrics.`,
  },
  {
    id: "navigation",
    title: "Finding your way around",
    route: "/dashboard",
    routeLabel: "Home",
    keywords: ["navigation", "sidebar", "menu", "bottom nav", "mobile", "where", "find", "pages"],
    body: `The left sidebar (a drawer behind the menu button on phones) has Home, AI Mode, Discover, Collections, Favourites, Watchlist, For You, Analytics, Wrapped, Messages, Community and Settings. On phones a bottom bar gives quick access to Home, Discover, For You, Watchlist, Collections and AI Mode. The top bar has global search, the notifications bell and your profile menu (profile, settings, sign out). Click anyone's avatar anywhere in the app to open their profile.`,
  },
  {
    id: "recommendations",
    title: "How recommendations work (\"Why this?\")",
    route: "/dashboard/for-you",
    routeLabel: "For You",
    keywords: ["recommendation", "recommender", "why this", "match", "for you", "discover", "picks", "algorithm", "how does it know", "embeddings"],
    body: `Recommendations come from a hybrid recommender: your explicit taste (onboarding answers and AI-mode answers, about 50%), semantic similarity using AI embeddings of every title, song and artist (about 35%), and collaborative filtering — "fans of X also liked Y" (about 15%). Recent watching and listening counts more than old activity (a 30-day half-life). Every recommended card shows a short "why this" reason, like "Because you loved Squid Game" or "Fits your vibe · Cozy". Home, Discover and For You are all ranked this way. Favouriting, watching, rating and AI-mode answers improve your picks; you can switch learning off in Settings → What the AI knows.`,
  },
  {
    id: "ai-mode",
    title: "AI mode: quiz or chat",
    route: "/dashboard/ai-mode",
    routeLabel: "AI Mode",
    keywords: ["ai mode", "quiz", "chat", "what should i watch", "what to watch", "tonight", "mood", "watch mode", "listen mode", "taste test"],
    body: `AI mode helps you decide what to watch or listen to. Pick Watch or Listen, then either take the animated taste quiz (vibe, themes, pace, how long you can commit, hours per week, things to avoid, the kind of viewer you are, worlds, endings, intensity, titles and artists you love) or just chat about your mood in your own words — the AI turns it into answers and asks one follow-up at a time. You get explained picks instantly, and can build a roadmap from them. AI mode also appears as a spotlight on Home ("tonight's picks") and as a launcher on For You and Discover. Your answers are saved to your AI profile and keep improving recommendations.`,
  },
  {
    id: "roadmaps",
    title: "AI roadmaps",
    route: "/dashboard/ai-mode/roadmap",
    routeLabel: "Roadmap",
    keywords: ["roadmap", "plan", "schedule", "weekly hours", "watch order", "steps", "swap", "adjust", "progress"],
    body: `An AI roadmap is an ordered plan of 6–9 titles (or songs/artists in Listen mode) grouped into phases, with a written analysis of your taste. It fits the hours per week you said you have: real runtimes are scheduled into weeks. Steps tick themselves off as you actually watch or listen — no manual tracking needed — and you can also mark a step done, undo it or drop it. If a step stalls you're offered a swap. Use the adjust chat ("make it shorter", "more anime", "no horror") to rebuild the rest of the plan while keeping finished steps. Build one from AI mode with "Build my roadmap"; Home shows your roadmap progress.`,
  },
  {
    id: "ai-profile",
    title: "Your AI profile and privacy controls",
    route: "/dashboard/settings/ai",
    routeLabel: "What the AI knows",
    keywords: ["ai profile", "what the ai knows", "privacy", "data", "download", "export", "wipe", "delete my data", "learning", "taste profile", "personalization"],
    body: `Settings → What the AI knows shows everything the recommender has learned: your taste map ("your taste reads as…"), what it learned from your watching and listening, and every answer you gave AI mode as a removable chip. You can remove anything that's no longer true, switch off "Learn from what I watch and listen to", download your AI profile as JSON, or wipe it completely. Changes apply to your next recommendations.`,
  },
  {
    id: "onboarding",
    title: "Onboarding and your taste profile",
    route: "/dashboard/settings/ai",
    routeLabel: "What the AI knows",
    keywords: ["onboarding", "sign up", "new account", "taste test", "first time", "preferences", "genres"],
    body: `When you sign up, a short onboarding taste test asks about the genres, formats, moods and languages you like. That starts your recommendations from day one. You can refine your taste any time by taking the AI-mode quiz or chatting with AI mode, and review or remove what was learned in Settings → What the AI knows.`,
  },
  {
    id: "discover-search",
    title: "Discover, For You and search",
    route: "/dashboard/discover",
    routeLabel: "Discover",
    keywords: ["discover", "search", "find a title", "trending", "new releases", "for you", "browse", "genre"],
    body: `Discover shows trending titles, new releases, trending music and picks ranked for you, plus your active taste filters. For You is your personal feed: recommended titles, "because you loved…" shelves, genre shelves, music and artists for your taste. Search from the bar at the top of every page — suggestions appear as you type (titles, songs, artists, profiles, collections, communities); press Enter for the full results page. Carousel rows slide on their own every few seconds and pause when you hover or focus them.`,
  },
  {
    id: "title-pages",
    title: "Title pages: trailers, where to watch, reviews",
    keywords: ["title page", "content page", "trailer", "where to watch", "streaming", "netflix", "episodes", "watch now", "reviews", "rate", "share", "detail"],
    body: `Each anime, show, movie or K-drama page has the poster, details, genres, cast and characters, episodes and seasons, related titles, featured soundtracks, collections and communities. Click "Watch trailer" on the poster to play the official trailer right there. "Where to watch" lists the legal streaming services for your region. "Watch now" plays full video only where an admin added a licensed source; otherwise use the streaming links. You can favourite, add to your watchlist, rate and review, share the page, and use "Catch me up" for a recap.`,
  },
  {
    id: "recap",
    title: "Catch me up (AI recaps)",
    keywords: ["catch me up", "recap", "summary", "where i left off", "previously on", "forgot", "remember", "spoiler", "what happened"],
    body: `"Catch me up" on a show, anime or film page writes a recap of only what you've already seen. Tell it where you stopped — season and episode, or how far into a film (it prefills a guess from your watch history) — and how much you remember (almost nothing, bits and pieces, most of it). It first looks up what happens up to that point in AniVerse's episode guides, or searches the web limited to that point, and then writes the recap with a strict rule never to go past your stopping point. You get the key beats, who's who, where things stand and what to keep in mind, with sources. Recaps are saved and shared, so repeat requests are instant.`,
  },
  {
    id: "music",
    title: "Songs, artists and listening",
    keywords: ["song", "music", "artist", "preview", "listen", "spotify", "apple music", "youtube music", "follow artist", "ost", "soundtrack", "lyrics"],
    body: `Song pages play the official 30-second preview and link to licensed services (Spotify, Apple Music, YouTube Music and others) to hear the full track; full audio plays only where an admin added a licensed file. AniVerse never shows lyrics. Artist pages show members, discography and listen links; you can follow and favourite artists, which shapes your music recommendations. Soundtracks (OSTs) link back to the show or film they come from.`,
  },
  {
    id: "library",
    title: "Favourites and watchlist",
    route: "/dashboard/watchlist",
    routeLabel: "Watchlist",
    keywords: ["watchlist", "favourites", "favorites", "save", "bookmark", "pending", "watching", "completed", "dropped", "priority", "heart"],
    body: `Favourite titles, songs, artists and collections with the heart button; see them all under Favourites. Add titles to your Watchlist to plan them; each item has a status — Pending, Watching, Completed or Dropped — and high-priority items are surfaced first. "Watch now" moves a title to Watching, and Continue Watching on Home and Discover picks up where you left off. Favourites and watch activity feed your recommendations.`,
  },
  {
    id: "collections",
    title: "Collections and smart collections",
    route: "/dashboard/collections",
    routeLabel: "Collections",
    keywords: ["collection", "playlist", "list", "create collection", "collaborator", "public", "private", "smart collection", "follow collection", "play"],
    body: `Collections are your own lists — a watch collection of titles or a music playlist. Make them public or private, add collaborators to build them together, and follow or favourite other people's public collections. Each collection has a play mode with an ambient, accent-themed player. "AI made these for you" on the Collections page suggests smart collections learned from your behaviour each week — save one (public or private) or dismiss it. Public collections and communities that fit your taste are also recommended to you.`,
  },
  {
    id: "communities",
    title: "Communities",
    route: "/dashboard/community",
    routeLabel: "Community",
    keywords: ["community", "communities", "join", "create community", "private community", "join code", "posts", "announcements", "chat", "members", "invite"],
    body: `Communities are fan spaces. Join public ones directly; private ones need a join code from a member, or an admin can invite their friends directly. Inside a community: Posts (with likes), Announcements, General Chat and Anime Chat (real-time), Watch Party, Listen Party, Talk Rooms, Analytics and Settings. Create your own community from the Community page and choose public or private. Community admins can manage members and channels.`,
  },
  {
    id: "watch-party",
    title: "Watch parties",
    keywords: ["watch party", "watch together", "sync", "host", "party", "play for everyone", "group watch"],
    body: `In a community, open Watch Party and click "Join watch party" on a channel. The first person to join is the host; the host picks the title (search box under the player, or "Play now" on a group pick) and controls play, pause and seek for everyone — playback stays in sync. Everyone can chat, send emoji reactions and suggest titles. It plays licensed video where available, otherwise the official trailer, otherwise a shared "watch together" clock. If the host leaves, the next member becomes host. Clicking a member's avatar in a party opens their profile in a new tab so you stay in the party.`,
  },
  {
    id: "listen-party",
    title: "Listen parties",
    keywords: ["listen party", "listen together", "queue", "music party", "dj", "shared queue"],
    body: `Listen Party in a community is a shared music queue everyone hears in sync. Anyone can add songs to the queue; the host controls play, pause, skip and the order. It plays licensed full audio where available, otherwise the official 30-second preview. Chat and reactions work like watch parties, and "What should we listen to?" suggests songs for the whole group.`,
  },
  {
    id: "talk-rooms",
    title: "Talk rooms (voice)",
    keywords: ["talk room", "voice", "voice chat", "call", "microphone", "mic", "mute", "vc"],
    body: `Talk Rooms are live voice channels in a community. Click "Join talk room", allow microphone access, and you're in — you can see who's speaking and mute yourself. Audio is peer-to-peer (WebRTC), so it works best for small groups; on some very strict networks people may not be able to connect.`,
  },
  {
    id: "group-picks",
    title: "Group AI mode in parties",
    keywords: ["group picks", "what should we watch", "what should we listen to", "group", "everyone", "friends together"],
    body: `In a watch or listen party, "What should we watch?" / "What should we listen to?" picks titles or songs that work for everyone currently in the party. Every member's own taste ranks a shared pool, titles most of the group has already seen are dropped, and a pick has to suit the least-happy member too, not just the average. Each pick shows the group match and each person's fit with a short reason, plus a one-line AI verdict. The host can play a pick directly; others can suggest it in chat.`,
  },
  {
    id: "ai-match",
    title: "AI Match rooms",
    route: "/dashboard/ai-mode/match",
    routeLabel: "AI Match",
    keywords: ["ai match", "match", "meet people", "find friends", "nearby", "room", "invite", "popup", "similar taste", "matching", "people like me"],
    body: `AI Match connects you with people who share your taste. Turn it on in AI Mode → AI Match: choose how far to look (nearby — needs your approximate location, your country, or worldwide) and what you're looking for. Open a room with a topic and size (3–12 people, open for 24 hours); AniVerse scores every opted-in user by taste similarity, shared favourites, personality and distance, and invites strong matches (60%+) or the best available. They get a popup and a notification and can join in one tap. Each room gets its own private community with a watch party and a talk room, and room members can DM each other. To limit spam, a person receives at most a few room invites per day.`,
  },
  {
    id: "messages",
    title: "Messages (DMs) and friends",
    route: "/dashboard/messages",
    routeLabel: "Messages",
    keywords: ["dm", "message", "messages", "chat with", "friend", "friend request", "follow", "unread", "can't message"],
    body: `Messages are direct, real-time conversations. You can message your friends and people in your AI Match rooms; for anyone else, send a friend request from their profile first. You can edit or delete your own messages, and unread counts show in the sidebar. Friends and follows are managed from profiles: follow someone to see their activity, or send a friend request (they accept or decline). Turn "Allow Messages" off in Settings → Privacy if you don't want DMs.`,
  },
  {
    id: "profiles",
    title: "Profiles",
    keywords: ["profile", "my profile", "edit profile", "avatar", "bio", "public profile", "private profile", "activity", "followers"],
    body: `Your profile shows your recent activity, favourite shows and movies, followed artists, favourite songs, collections, communities, friends and reviews. Edit your name, bio and avatar from your profile. In Settings → Privacy you can make your profile private (only friends see it), and hide your activity or watch history. Click anyone's avatar anywhere in AniVerse to open their profile.`,
  },
  {
    id: "analytics",
    title: "Analytics and Taste DNA",
    route: "/dashboard/analytics",
    routeLabel: "Analytics",
    keywords: ["analytics", "stats", "statistics", "hours watched", "taste dna", "taste fit", "rhythm", "streak", "habits", "insights"],
    body: `Analytics is live from your real activity and refreshes about every minute: total watch and listen time, monthly trends, watchlist progress, genre split, how your taste reads (vibes radar), weekly rhythm and peak hours in your time zone, taste fit per month, ratings you give, format split, community engagement, and your top titles and artists. Taste DNA history shows your strongest taste traits month by month, which are rising or fading, and your "eras" — runs of months with the same standout trait.`,
  },
  {
    id: "wrapped",
    title: "AniVerse Wrapped",
    route: "/dashboard/wrapped",
    routeLabel: "Wrapped",
    keywords: ["wrapped", "year in review", "recap of my year", "share card", "persona", "spotify wrapped", "top of the year"],
    body: `Wrapped is a Spotify-Wrapped-style story of your year built from real activity: hours watched and listened, your #1 title and top five, top format and genres, your Taste DNA vibes and eras, top artist, songs and music mood, your rhythm (time of day, biggest day, longest streak), your top-% rank among AniVerse users, and an AI-named persona. Tap to advance, hold to pause, use arrow keys on a keyboard. At the end, share or save a 1080×1920 card for stories.`,
  },
  {
    id: "daily-limit",
    title: "Daily limit (screen time)",
    route: "/dashboard/settings",
    routeLabel: "Settings",
    keywords: ["daily limit", "screen time", "time limit", "lock", "locked", "binge", "wellbeing", "timer", "midnight"],
    body: `Settings → Daily limit lets you set how much time you want on AniVerse per day. You get a warning 5 minutes before the limit, and when it's reached the app locks until midnight in your time zone — it's strict on purpose. While a limit is active you can't change your time zone to get around it. Turn the limit off or change it in Settings when you're not locked.`,
  },
  {
    id: "settings",
    title: "Settings and account",
    route: "/dashboard/settings",
    routeLabel: "Settings",
    keywords: ["settings", "account", "password", "change password", "delete account", "notifications", "privacy", "preferences", "email", "sign out", "logout"],
    body: `Settings has: Public profile (name, bio, avatar), Account (email and password), Preferences, Notifications, Privacy (public profile, show activity, show watch history, allow messages), Taste & AI (link to What the AI knows), Daily limit, and the Danger zone where you can delete your account permanently. Sign out from the profile menu in the top bar. You can sign in with email and password or with Google.`,
  },
  {
    id: "notifications",
    title: "Notifications",
    keywords: ["notification", "notifications", "bell", "alerts", "invite popup"],
    body: `The bell in the top bar shows your notifications — friend requests, AI Match room invites, community activity and more — with an unread count. AI Match invites also appear as a popup you can join or dismiss. Choose which notifications you get in Settings → Notifications.`,
  },
  {
    id: "legal",
    title: "Why can't I stream everything here?",
    keywords: ["stream", "free", "pirate", "download", "full episode", "full movie", "full song", "legal", "copyright", "watch full"],
    body: `AniVerse is legal-first. It doesn't host or scrape copyrighted video or audio. You get official trailers, official 30-second song previews and links to licensed services in your region ("where to watch / listen"). Full episodes, films or songs play inside AniVerse only where an admin has added a properly licensed source.`,
  },
  {
    id: "assistant",
    title: "About this assistant",
    keywords: ["assistant", "chatbot", "help", "you", "who are you", "how do you work", "ai help"],
    body: `The AniVerse Assistant answers questions about the app, the catalog and your own account. It retrieves from AniVerse's help articles, the catalog (titles, songs, artists) and a private snapshot of your own stats, then answers only from what it found, with links. It can't change settings or take actions for you — it tells you where to go. Your conversation stays in your browser.`,
  },
];

/** The text embedded and searched for each article. */
export function helpArticleText(article: HelpArticle) {
  return `${article.title}. ${article.body} Keywords: ${article.keywords.join(", ")}.`;
}

/** Suggested questions by page, shown when the assistant opens. */
export function suggestedQuestions(pathname: string): string[] {
  const rules: [RegExp, string[]][] = [
    [/^\/dashboard\/ai-mode\/match/, ["How does AI Match pick who to invite?", "Can people from other countries join my room?", "Who can I message after joining a room?"]],
    [/^\/dashboard\/ai-mode\/roadmap/, ["How does my roadmap track progress?", "Can I make my roadmap shorter?", "What happens if I stop watching a step?"]],
    [/^\/dashboard\/ai-mode/, ["Quiz or chat — which should I use?", "How does AI mode pick titles?", "How do I build a roadmap?"]],
    [/^\/dashboard\/analytics/, ["What is Taste DNA?", "How is taste fit calculated?", "How much did I watch this month?"]],
    [/^\/dashboard\/wrapped/, ["How is my Wrapped persona chosen?", "How do I share my Wrapped card?", "What does my top-% rank mean?"]],
    [/^\/dashboard\/collections/, ["How do smart collections work?", "Can friends edit my collection?", "How do I make a collection private?"]],
    [/^\/(dashboard\/community|community)/, ["How do I start a watch party?", "How do I join a private community?", "What is group AI mode?"]],
    [/^\/dashboard\/messages/, ["Why can't I message someone?", "How do I send a friend request?", "Can I turn off DMs?"]],
    [/^\/dashboard\/settings/, ["How does the daily limit work?", "How do I download my AI data?", "How do I make my profile private?"]],
    [/^\/content\//, ["What does Catch me up do?", "Where can I watch this legally?", "Recommend something similar"]],
    [/^\/song\//, ["Why only a 30-second preview?", "Where can I hear the full song?", "Recommend similar songs"]],
  ];
  return rules.find(([pattern]) => pattern.test(pathname))?.[1] ?? ["What can I do on AniVerse?", "Why was this recommended to me?", "How do watch parties work?", "Suggest an anime for tonight"];
}
