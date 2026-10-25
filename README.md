# AniVerse

**AniVerse** is an AI-powered entertainment hub for anime, shows, K-dramas, films and music. You discover titles matched to your taste, with a reason for every pick. AI mode turns your mood into a time-budgeted roadmap of what to watch or listen to next. AI Match opens rooms with people who share your taste, and every community has live watch parties, listen parties and voice talk rooms. You can ask for a spoiler-safe recap before you continue a show, see your Taste DNA change month by month, and get a Spotify-style Wrapped of your year.

It's a full-stack Next.js application: PostgreSQL + Prisma, NextAuth (credentials + Google), **108 REST API routes**, Socket.IO realtime (community chat, DMs, synced parties, WebRTC voice signalling), a role-scoped admin CMS with AI-assisted import, a hybrid deep-learning recommender built on Gemini, and retrieval-augmented generation (RAG) for recaps, roadmaps and AI mode.

> **Why it exists:** people pay for several streaming apps and still lose 20 minutes scrolling — they don't know what to watch next, or in what order. AniVerse answers *what*, *why* and *in what order*.

📍 **Full history, status and what's left:** [project-roadmap.md](project-roadmap.md)

---

## Contents

- [Highlights](#highlights)
- [AI features](#ai-features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Architecture](#architecture)
- [User flow](#user-flow)
- [Routes](#routes)
- [API surface](#api-surface)
- [Data model](#data-model)
- [Feature wiring map](#feature-wiring-map)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Design system](#design-system)
- [Status & what's left](#status--whats-left)

---

## Highlights

| | |
|---|---|
| 🎯 **Hybrid recommender** | Explicit taste + semantic embeddings (`gemini-embedding-001`) + collaborative filtering + watch/listen history. Every card says *why*. |
| ✨ **AI mode** | Watch or Listen. Answer by an animated taste quiz **or** a chat; get explained picks instantly. |
| 🗺️ **AI roadmaps** | An ordered plan that fits your weekly hours, with a written analysis of your taste. Steps tick off as you watch. |
| 📒 **Smart collections** | Weekly collection ideas learned from your behaviour — save or dismiss. |
| 🛠️ **AI-assisted Admin CMS** | Import titles, songs and artists from TMDB, AniList, Apple Music, Deezer and MusicBrainz; AI review before publishing. |
| 🎬 **Legal media** | Official trailers, "where to watch" (JustWatch via TMDB), official 30-second previews and listen links. |
| 🤝 **AI Match rooms** | Open a room and everyone whose taste matches (nearby, in your country or worldwide) gets a popup invite. One tap to join. |
| 🍿 **Watch, listen & talk parties** | Synced watch parties and listen parties, plus voice talk rooms (WebRTC) in every community. Group AI mode picks what works for everyone. |
| 🧠 **Catch me up** | Tell the AI where you stopped; it recaps only what you've seen, grounded in episode guides or the web (RAG). |
| 🧬 **Taste DNA & Wrapped** | Your taste traits month by month, the "eras" they form, and a Spotify-style Wrapped with an AI-named persona and a share card. |
| 💬 **Social & realtime** | Communities with posts and live chat, friends, DMs, collaborative collections. |
| 📊 **Live analytics** | Watch/listen time, taste fit, rhythm and traits from real-time activity. |
| ⏳ **Daily limit** | Set a daily screen-time limit; a 5-minute warning, then the app locks until midnight. |
| 🔐 **You own your data** | See, edit, download or wipe what the AI knows; switch off learning. |

---

## AI features

| Feature | What it does | Where |
|---|---|---|
| **Hybrid recommender** | Blends explicit taste (50%), semantic similarity from a pre-trained embedding model (35%) and item-item collaborative filtering (15%). Learns from watch/listen history with a 30-day half-life. | Home, Discover, For You, "more like this" |
| **"Why this?" on every card** | Spoiler-free reasons — *"Because you loved Squid Game · Thriller & Drama"*, *"Fits your vibe · Cozy & Funny"*, *"Has Money Heist + 4 more you love"*. | Hover/focus any recommended card |
| **AI mode** | Watch or Listen. An animated quiz (vibe, themes, pace, commitment, hours/week, things to avoid, viewer personality) **or** a chat where Gemini turns free text into structured answers, asking one follow-up at a time. | `/dashboard/ai-mode`, Home spotlight, For You, Discover |
| **AI roadmaps** | 6–9 ordered steps in phases with a written taste analysis. Runtimes come from catalog data and are scheduled into weeks of your hours. Steps update from real activity; stalled ones get a swap; an adjust-chat ("make it shorter", "more anime") rebuilds the rest and keeps finished steps. | `/dashboard/ai-mode/roadmap` |
| **Smart collections** | Each week, your strongest learned vibes become collection ideas — mostly your own titles plus close picks. | Collections page |
| **Social recommendations** | Public collections and communities ranked by taste fit, titles you love inside them, and "kindred" members who share your favourites. | Home, Collections, Community |
| **AI profile** | Taste map ("your taste reads as…"), what was learned from activity, every answer as a removable chip; switch off learning, download (JSON) or wipe. | Settings → What the AI knows |
| **AI Match** | Opt-in profile (scope, approximate location, intent). When someone opens a room, AniVerse scores every opted-in user by taste similarity (embeddings), shared favourites, personality and distance, then invites strong matches (≥ 60%) or the best available. Invites arrive as a popup and a notification. Each room gets its own community with a watch channel and a voice channel. | `/dashboard/ai-mode/match` |
| **Group AI mode** | "What should we watch / listen to?" inside a party. Every member's ranking scores a shared pool; titles most of the group has already seen are dropped. A pick must work for the least-happy member too (60% mean + 40% minimum). Each pick shows the fit for every person, plus a one-line AI verdict. | Watch & listen parties |
| **Catch me up (RAG)** | Asks where you stopped (prefilled from watch history) and how much you remember. **Retrieves** episode descriptions up to that point, or web research limited to it, then **generates** a recap with a strict "never past the stopping point" rule, with sources shown. Cached per title, stopping point and depth. | "Catch me up" on title pages |
| **Taste DNA history** | Each month's watching and favourites become a point in embedding space, read against the trait vocabulary on one shared scale. Shows strands for your strongest traits, rising and fading traits, and eras. | Analytics |
| **AniVerse Wrapped** | A story of your year built from real activity: hours, top titles, songs and artists, genres and format, vibes, eras, rhythm, longest streak, your top-% rank, and an AI-named persona. It ends with a 1080×1920 share card drawn on canvas. | `/dashboard/wrapped` |
| **Admin AI import & review** | Facts (episodes, cast, durations, members, artwork) mapped in code from metadata APIs; editorial fields drafted by the model; a second AI pass reviews the whole form, with one-click fixes and live progress. | Admin CMS |

**How it's built**

- **Embeddings:** every catalog item becomes a spoiler-free text (type, genres, tags, credits, synopsis), encoded by `gemini-embedding-001` (768 dimensions). Vectors live in `CatalogEmbedding` and are re-embedded only when an item's text changes; the sync runs after every admin save. The catalog is a few hundred items, so similarity search is an in-memory dot product — no vector database.
- **Grounded generation:** the LLM only ever picks from catalog IDs the recommender hands it (schema-enforced enums), so it can't recommend titles that don't exist. Facts are never generated — they come from metadata APIs.
- **RAG:** every generative feature retrieves real data first, then generates from it.
  - AI mode and roadmaps: retrieve ranked catalog candidates, then generate the order and analysis.
  - Admin import/review: retrieve metadata API facts plus Google-Search-grounded research, then generate drafts.
  - Recaps: retrieve episode guides up to the stopping point, else web research limited to it, then generate the recap; sources are shown.
- **Free-tier aware:** Gemini Flash for heavy admin work and roadmaps; it falls back automatically to Flash-Lite when its ~20/day free quota runs out. Flash-Lite handles the high-volume, user-facing calls: chat, recaps, group verdicts and Wrapped personas. Embeddings are paced to 100/min. Without any AI key, everything falls back to the taste engine.
- **Pluggable provider:** `AI_PROVIDER=gemini` (default, free) or `claude` (Anthropic, paid).
- **Evaluation:** `npm run eval:recommender` runs a leave-one-out test. Latest titles result: full hybrid **MRR@20 0.350** vs 0.203 popularity baseline and 0.189 taste engine alone ([docs/recommender-evaluation.md](docs/recommender-evaluation.md); small seeded dataset, so treat it as indicative).
- **Copyright-safe:** no scraped video or audio, no generated or imported lyrics — only official trailers, official previews and links to legal services.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Server Components) + custom `server.ts` |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Framer Motion, Lucide, CVA |
| Auth | [NextAuth.js v5](https://authjs.dev) — JWT sessions; credentials, Google (Discord wired) |
| Database | PostgreSQL + Prisma 6 |
| Validation | Zod 4 |
| Realtime | Socket.IO 4 (`/api/socket/io`) |
| Charts | Recharts 3 |
| AI | Google Gemini via `@google/genai` (Flash, Flash-Lite, `gemini-embedding-001`); Anthropic Claude optional via `@anthropic-ai/sdk` |
| Metadata APIs | TMDB, AniList, Apple Music (iTunes Search), Deezer, MusicBrainz, JustWatch (via TMDB) |
| Security | bcryptjs passwords, role-gated admin APIs, server-only AI keys |

> Use `npm run dev` / `npm start` (runs `tsx server.ts`). Plain `npm run dev:next` starts Next **without** Socket.IO — community chat, live DMs, watch/listen parties and talk rooms won't work.

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL (running locally on `localhost:5432` by default)
- npm

### 1. Install

```bash
cd aniverse-application
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `AUTH_SECRET` | Yes | JWT signing (`npx auth secret`) |
| `AUTH_URL` / `NEXTAUTH_URL` | Yes (dev) | e.g. `http://localhost:3000` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` / `ADMIN_HANDLE` | Seed | Super-admin account created by the seed |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Google sign-in (redirect URI `http://localhost:3000/api/auth/callback/google`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Optional | Discord sign-in |
| `GEMINI_API_KEY` | Recommended | All AI features — free key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `AI_PROVIDER` | Optional | `gemini` (default) or `claude` |
| `GEMINI_MODEL` / `GEMINI_FAST_MODEL` | Optional | Override `gemini-flash-latest` / `gemini-flash-lite-latest` |
| `ANTHROPIC_API_KEY` | Optional | Claude as the provider (paid) |
| `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` | Optional | Movies/shows/K-drama import, trailers, "where to watch" (anime import via AniList needs no key) |
| `WATCH_REGION` | Optional | Country for providers, previews and listen links (default `IN`) |
| `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_APP_URL` | Optional | Socket client URL / public app URL |

Never commit `.env.local`; AI and API keys are only read on the server.

### 3. Database

```bash
npm run db:generate
npm run db:migrate      # or: npx prisma migrate deploy
npm run db:seed
```

### 4. AI setup (once, after adding `GEMINI_API_KEY`)

```bash
npm run embed:catalog   # embeds every catalog item for the recommender (~2 min on the free tier)
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Seeded accounts

| Role | Login |
|---|---|
| Super admin | `admin@aniverse.local` / `Admin123!` (or your `ADMIN_*` values) |
| Content admin | `content@aniverse.local` / `Content123!` |
| Music admin | `music@aniverse.local` / `Music123!` |
| Artist admin | `artist@aniverse.local` / `Artist123!` |
| Demo users | Created by the seed; `npx tsx scripts/seed-active-profile.ts` fills an account with realistic activity |

**Roles:** `USER` · `CONTENT_ADMIN` · `MUSIC_ADMIN` · `ARTIST_ADMIN` · `SUPER_ADMIN`

### Troubleshooting

- **`prisma generate` fails with `EPERM` on Windows:** stop `npm run dev`, regenerate, restart.
- **`next build` fails inside `.next/dev/types/...`:** a dev server left a half-written file; restart `npm run dev`.
- **Google sign-in "AccessDenied":** usually PostgreSQL isn't running.
- **TMDB unreachable in India:** the app already uses `api.tmdb.org` (the `api.themoviedb.org` host is ISP-blocked).
- **AI says the free-tier limit was reached:** Flash allows ~20 requests/day; the app falls back to Flash-Lite automatically, or try again tomorrow.
- **A recap says "grounded in the synopsis only":** the free Google Search grounding quota is used up for the day. That recap isn't cached, so a fuller, web-grounded one is written once the quota returns.
- **Talk room can't connect between two networks:** WebRTC uses public STUN only; very strict NATs need a TURN server.

---

## Architecture

```
Browser (client components)
   │
   ├── REST ──────────► app/api/** ──► lib/services/** ──► Prisma ──► PostgreSQL
   │                        │
   │                        └── AI routes ──► lib/ai/** (Gemini / Claude)
   │                                           lib/recommender/** (embeddings, hybrid, social)
   │                                           lib/catalog-import/sources/** (TMDB, AniList, iTunes, Deezer, MusicBrainz)
   │
   ├── NDJSON streams ◄── long AI tasks (admin import/review, roadmap builds) report live progress
   │
   ├── Socket.IO ─────► server.ts ──► lib/socket/server.ts (community chat, DM rooms)
   │                                   lib/socket/parties.ts (synced watch/listen parties, WebRTC voice signalling)
   │
   └── RSC pages ─────► lib/data/** (thin accessors) ──► lib/services/** ──► Prisma
```

**Recommender pipeline**

```
catalog item ──► spoiler-free text ──► gemini-embedding-001 ──► CatalogEmbedding (768-d)
                                                                     │
user: favorites · history (30-day decay) · watchlist · follows · AI-mode answers
         │                                                           │
         ▼                                                           ▼
  taste engine score (50%)  +  semantic similarity to taste centroid (35%)  +  co-occurrence (15%)
         │
         ▼
  diversified ranking + "why this" reason ──► cards · AI mode · roadmaps (LLM orders real IDs only)
```

| Layer | Responsibility |
|---|---|
| `app/**/page.tsx` | Routes, layouts, server data loading |
| `components/**` | UI by domain |
| `lib/data/**` | Page-oriented accessors |
| `lib/services/**` | Business logic (auth, catalog, feeds, social, DMs, analytics, AI profile, roadmaps…) |
| `lib/ai/**` | LLM provider layer, admin import/review, AI-mode chat, roadmap planner, progress streaming |
| `lib/recommender/**` | Embeddings store, hybrid scoring, collection/community ranking |
| `lib/ai-profile/**` · `lib/roadmap/**` | Client-safe AI vocabularies, schemas, quiz, runtime estimates |
| `lib/catalog-import/**` | Metadata source clients |
| `lib/mappers/**` · `lib/validators/**` | DB → view models · Zod request schemas |
| `lib/socket/**` | Realtime auth, rooms, broadcast, party state and voice signalling |
| `lib/party/**` · `lib/match/**` · `lib/recap/**` · `lib/wrapped/**` · `lib/screen-time/**` | Client-safe types for parties, AI Match, recaps, Wrapped and the daily limit |
| `prisma/schema.prisma` | Source of truth for the data model |

---

## User flow

```
Landing (/)
   ├── Login (/login) ── credentials or Google ──► /api/auth/redirect-destination
   │                                                  ├── onboarding incomplete → /onboarding
   │                                                  └── else → /dashboard
   └── Signup (/signup) ── POST /api/auth/register ──► /onboarding (taste quiz → TasteProfile)

Dashboard (/dashboard)
   ├── Home ── AI-mode spotlight (tonight's picks · roadmap progress) · feeds · communities · collections
   ├── AI Mode ── Watch / Listen ── quiz or chat ──► explained picks ──► Build my roadmap
   │          └── AI Match ── open a room ──► matched users get a popup ──► room community (party · talk room · DMs)
   ├── Discover · For You · Watchlist · Collections (+ smart ideas) · Favourites
   ├── Analytics (+ Taste DNA history) · Wrapped · Messages · Community · Settings (+ What the AI knows, daily limit)
   ├── Search (/search?q=…)
   └── Detail & play: /content/[id] (+ in-hero trailer, Catch me up, where to watch, /watch) · /song/[id] (+ preview, listen links)
                      /artist/[id] · /collection/[id] (+ /play) · /profile/[handle] · /community/[slug]

Admin (/admin) ── role-gated CMS ── AI import · AI review · clear form
```

---

## Routes

### Public

| Route | Description |
|---|---|
| `/` | Marketing landing |
| `/login` · `/signup` | Credentials + Google |
| `/search?q=` | Ranked search results |

### App (signed in)

| Route | Description |
|---|---|
| `/onboarding` | Taste quiz (DB-persisted) |
| `/dashboard` | Home: AI-mode spotlight, feeds, communities, collections |
| `/dashboard/ai-mode` | AI mode — Watch/Listen, quiz or chat, explained picks |
| `/dashboard/ai-mode/roadmap` | AI roadmaps (`?mode=watch|listen`) |
| `/dashboard/ai-mode/match` | AI Match: profile, open a room, your rooms |
| `/dashboard/discover` · `/dashboard/for-you` | Hybrid-ranked feeds + AI-mode launcher |
| `/dashboard/watchlist` · `/dashboard/favorites` | Library |
| `/dashboard/collections` | Collections hub + "AI made these for you" |
| `/dashboard/community` | Community hub |
| `/dashboard/analytics` | Live analytics + Taste DNA history |
| `/dashboard/wrapped` | AniVerse Wrapped story + share card |
| `/dashboard/messages` · `/dashboard/notifications` | DMs · notifications |
| `/dashboard/settings` · `/dashboard/settings/ai` | Settings (incl. daily limit) · What the AI knows |

### Detail & play

| Route | Description |
|---|---|
| `/content/[contentid]` | Title detail; "Watch trailer" plays inside the hero image panel; "Catch me up" recap; where to watch |
| `/content/[contentid]/watch` · `/watch/[episodeid]` | Player + watch events |
| `/song/[songid]` | Track detail, 30s preview, listen links |
| `/artist/[artistid]` · `/play` | Artist detail, listen links · artist play flow |
| `/collection/[collectionid]` · `/play` | Collection (content or music) · player |
| `/music-collection/[collectionid]` | Legacy redirect → `/collection/...` |
| `/profile/[userid]` · `/friends` | Profile · friends |
| `/community/[communityid]` · `/dashboard/[section]` | Community landing · in-community dashboard |

**Community sections:** `posts` · `chat` · `anime-chat` · `watch-channel` (watch party) · `listen-party` · `voice-channel` (talk rooms) · `announcements` · `analytics` · `settings`

### Admin

| Route | Description |
|---|---|
| `/admin` | CMS overview |
| `/admin/{content,music,artists,collections,communities}` (+ `/new`, `/[id]/edit`) | Role-gated CRUD with AI import (content, music, artists), AI review and clear-form |

---

## API surface

108 route handlers under `app/api/**`, grouped:

| Group | Routes |
|---|---|
| **Auth** | `/api/auth/[...nextauth]` · `register` · `redirect-destination` · `clear-stale-session` |
| **Onboarding** | `/api/onboarding/profile` · `complete` · `recommendations` |
| **Users & social** | `/api/users/search` · `[handle]` (+ `follow`) · `me` (+ `settings`, `password`, `delete`) · `/api/friend-requests/[id]/accept|reject` |
| **Content** | `/api/content/[slug]/` `favorite` · `watchlist` · `reviews` · `view` · `watch-start` · `watch-event` · `engagement` · `recap` (GET options, POST streaming) |
| **Music & artists** | `/api/song/[slug]/favorite|reviews|listen` · `/api/artist/[slug]/favorite|follow|play|reviews` |
| **Collections** | `/api/collections` (+ `[slug]`, `items`, `items/[itemId]`, `favorite`, `follow`, `play`, `collaborators`) |
| **Watchlist & reviews** | `/api/watchlist` (+ `[id]`) · `/api/reviews/[id]` (+ `like`) |
| **Communities** | create/list · `[slug]` · `join` · `join-code` · `join-by-code` · `invite-friends` · `members` · `posts` (+ `like`) · `chat` · `reviews` · `voice-channels` · `watch-channels` · `group-picks` |
| **DMs** | `/api/dm/conversations` (+ `messages`, `read`) · `send` · `messages/[id]` · `unread` |
| **AI (users)** | `/api/ai/profile` (GET/PATCH/DELETE) · `profile/export` · `mode/chat` · `mode/picks` · `roadmaps` (GET/POST streaming) · `roadmaps/[id]` · `roadmaps/[id]/steps/[stepId]` · `smart-collections` (+ `[id]`) |
| **AI Match** | `/api/match/profile` · `rooms` (+ `[id]`: join, decline, seen, leave) · `invites` |
| **Wellbeing** | `/api/screen-time` (settings) · `screen-time/heartbeat` |
| **Admin** | `/api/admin/{content,music,artists,collections,communities}` (+ `[id]`) · `catalog-search` |
| **Admin AI** | `/api/admin/ai/{content,music,artists}/{search,import,review}` (import/review stream progress) |
| **Other** | `/api/search` (autocomplete) · `/api/upload` · `/api/analytics` · `/api/notifications` (+ `[id]`) |

**Socket.IO events:** `party:join|leave|control|chat|reaction` (host-controlled sync with clock-skew correction) · `voice:join|signal|state|leave` (WebRTC mesh signalling, public STUN).

---

## Data model

57 Prisma models across 32 additive migrations.

| Domain | Models |
|---|---|
| **Identity** | `User`, `Account`, `TasteProfile`, `UserPreferences` |
| **Catalog** | `Content` (+ `ContentSeason`, `ContentEpisode`, `ContentCharacter`, `ContentFeaturedTrack`, `ContentRelated`), `MusicTrack`, `Artist`, `ArtistMember`, `Genre`, `ContentGenre`, `CatalogReview` |
| **Library** | `WatchlistItem`, `Collection` (+ `CollectionItem`, `CollectionFavorite`, `CollectionFollow`, `CollectionCollaborator`), `ContentFavorite`, `ArtistFavorite`, `ArtistFollow`, `TrackFavorite` |
| **Social** | `UserFollow`, `FriendRequest`, `Community` (+ members, posts, likes, chat messages, voice/watch channels and members), `Review`, `ReviewLike` |
| **Messaging** | `DirectConversation`, `DirectMessage`, `DirectConversationRead` |
| **Activity** | `Notification`, `Rating`, `WatchEvent`, `ListenEvent` |
| **AI** | `CatalogEmbedding`, `AiTasteProfile`, `AiRoadmap`, `AiRoadmapStep`, `AiCollectionSuggestion`, `AiRecap` |
| **AI Match** | `MatchProfile`, `MatchCircle` (rooms), `MatchCircleMember` |
| **Wellbeing** | `ScreenTimeSettings`, `ScreenTimeDay` |

Media fields: `Content.trailerUrl` / `tmdbId` / `tmdbKind`, `MusicTrack.previewUrl` / `listenLinks`, `Artist.listenLinks`.

---

## Feature wiring map

| Feature | UI | Service | Persistence | Realtime |
|---|---|---|---|---|
| Login / signup / Google | `components/auth/*` | `user.service`, `findOrCreateOAuthUser` | `User`, `Account` | — |
| Onboarding | `components/onboarding/*` | `onboarding*.service` | `TasteProfile` | — |
| Feeds + "why this" | Dashboard pages, cards | `taste-engine.service`, `lib/recommender/*` | catalog + `CatalogEmbedding` + events | — |
| AI mode | `components/ai-mode/*` | `ai-mode.service`, `lib/ai/ai-mode-chat` | `AiTasteProfile` | — |
| AI roadmaps | `roadmap-board` | `roadmap.service`, `lib/ai/roadmap-planner` | `AiRoadmap`, `AiRoadmapStep` | NDJSON progress |
| Smart collections | `smart-collection-ideas` | `smart-collections.service` | `AiCollectionSuggestion` → `Collection` | — |
| AI profile | `components/settings/ai-profile-view` | `ai-profile.service` | `AiTasteProfile` | — |
| Admin AI import/review | `components/admin/ai/*` | `lib/ai/*-import`, `*-review` | catalog models | NDJSON progress |
| Watch / listen | Play views | content/music play services | `WatchEvent`, `ListenEvent` | — |
| Collections | Hub, detail, play | `collection*.service` | `Collection*` | — |
| Communities | Community dashboard | `community*.service` | community tables | Socket.IO chat |
| DMs | Messages panel | `dm.service` | DM tables | Socket.IO + REST |
| Notifications | Bell + page | `notification.service` | `Notification` | HTTP polling |
| Analytics + Taste DNA | Charts, `taste-dna-history` | `analytics.service`, `wrapped.service` | events + ratings + `CatalogEmbedding` | live refresh |
| Wrapped | `components/wrapped/*` | `wrapped.service` | events, favorites, community activity | — |
| AI Match | `match-experience`, `match-invite-popup` | `match.service` | `MatchProfile`, `MatchCircle*` → `Community` | popup polling + notifications |
| Watch / listen parties | `components/party/*` | `lib/socket/parties.ts` | in-memory party state; watch/listen events | Socket.IO |
| Talk rooms (voice) | `talk-room` | `lib/socket/parties.ts` | — | Socket.IO signalling + WebRTC |
| Group AI mode | `group-picks` | `group-picks.service` | taste signals + embeddings | — |
| Catch me up | `recap-dialog` | `lib/ai/recap.ts` | `AiRecap` (shared cache) | NDJSON progress |
| Daily limit | `components/screen-time/*` | `screen-time.service` | `ScreenTimeSettings`, `ScreenTimeDay` | heartbeat |

**Media behaviour**

- Title pages have a "Watch trailer" button over the hero image; the official trailer (`youtube-nocookie`) plays inside that panel, and the poster stays the default. Live streaming providers for `WATCH_REGION` are shown below it.
- Players use full audio when an admin sets a licensed `audioUrl`, then the official 30s preview, then a demo track (badged).
- Watch parties sync the shared player (licensed video or the trailer) and listen parties sync a shared queue (licensed audio or the 30s preview). The host controls playback; others can add songs and suggest picks. Party state lives in memory on the Socket.IO server.
- Talk rooms are peer-to-peer WebRTC voice (a mesh, best for small groups) over public STUN. Strict NATs would need a TURN server.

---

## Project structure

```
aniverse-application/
├── app/
│   ├── (auth)/                  # login, signup
│   ├── admin/                   # role-gated CMS
│   ├── api/                     # 108 REST route handlers (incl. api/ai, api/match, api/admin/ai)
│   ├── dashboard/               # hubs, ai-mode (+ roadmap, match), wrapped, settings (+ ai)
│   └── content|song|artist|collection|community|profile|search|onboarding/
├── components/
│   ├── ai-mode/                 # quiz, chat, results, roadmap board, spotlight, launcher, AI Match
│   ├── party/                   # watch party, listen party, talk room, group picks
│   ├── wrapped/                 # Wrapped story + canvas share card
│   ├── screen-time/             # daily-limit gate, warning, lock screen
│   ├── admin/ (+ ai/)           # CMS forms, AI import/review panels
│   ├── cards/ · dashboard/ · collections/ · community/ · settings/ · …
├── hooks/                       # AI task progress, drafts, chat, layout helpers
├── lib/
│   ├── ai/                      # provider layer (Gemini/Claude), imports, reviews, chat, roadmap planner, recaps
│   ├── ai-profile/              # AI-mode vocabulary, schemas, quiz, summaries (client-safe)
│   ├── recommender/             # embeddings, hybrid scoring, social ranking
│   ├── roadmap/                 # runtime estimates, view types
│   ├── catalog-import/          # TMDB, AniList, iTunes, Deezer, MusicBrainz clients
│   ├── party/ · match/ · recap/ · wrapped/ · screen-time/   # client-safe types
│   ├── services/ · data/ · mappers/ · validators/ · socket/
│   └── auth.ts · auth-guards.ts · api-auth.ts · admin-auth.ts
├── prisma/                      # schema.prisma, seed.ts, migrations/
├── scripts/                     # embed-catalog, eval-recommender, backfill-trailers, seed-match-demo, seed-active-profile, …
├── docs/                        # recommender-evaluation.md
├── types/                       # domain types + next-auth.d.ts
├── middleware.ts                # protects dashboard / onboarding / admin
├── server.ts                    # Next + Socket.IO
├── project-roadmap.md           # history, status, what's left
└── .env.example
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with Socket.IO (`tsx server.ts`) |
| `npm run dev:next` | Next only (no Socket.IO) |
| `npm run build` | Production build |
| `npm start` | Production server + Socket.IO |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:push` | Prisma db push |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed catalog, admins and demo users |
| `npm run db:reset` | Wipe and reseed |
| `npm run db:recovery` | Recovery seed script |
| `npm run embed:catalog` | Embed the catalog for the recommender (incremental; `-- --force` to redo all) |
| `npm run eval:recommender` | Offline leave-one-out evaluation → `docs/recommender-evaluation.md` |
| `npm run backfill:trailers` | Link TMDB ids and official trailers for existing titles |
| `npx tsx scripts/seed-match-demo.ts` | Demo users with AI Match profiles, for testing rooms and invites |
| `npx tsx scripts/seed-active-profile.ts` | Fill an account with realistic favourites, history and collections |

---

## Design system

Tokens live in `app/globals.css` (Tailwind v4 `@theme`) — use them instead of arbitrary values.

| Token | Rule |
|---|---|
| **Radius** | `lg` 8 · `xl` 12 · `2xl` 16 · `card` 20 · `3xl` 24 · `full`. Same component type = same radius (every card is `rounded-card`). |
| **Type** | `micro` 11 (chip/badge labels only) · `caption` 12 · `small` 13 · `body` 15 · `subtitle` 16 · `lead` 18 · `heading` 24 · `title` 32 · `display` 64 (landing hero only). Nothing readable below 12px. |
| **Font** | Geist (via `next/font`) on every platform. |
| **Colour** | Brand `brand-purple → brand-fuchsia → brand-magenta`, accent text `brand-pink`; surfaces `background`, `surface`, `night`, `popover`, `popover-deep`. Genre chip gradients meet WCAG AA. |
| **Glow** | One soft halo, reserved for the primary CTA, active nav, now-playing and card hover. |
| **Layout** | Mobile-first, 320px → desktop. Dashboard pages: `max-w-[1200px]`, `gap-5 sm:gap-6`, `px-4 sm:px-6 lg:px-8`. Drawer + bottom nav below `lg`. |

Shared building blocks: `Button` / `GradientButton`, `EmptyState`, `useConfirm()` / `useToast()`, `ComingSoonNotice` and `PreviewBadge` for unfinished or preview features, route skeletons in `components/skeletons/`, `CardBlurb` for "why this" lines. Focus rings and `prefers-reduced-motion` (including Framer Motion) are handled globally.

---

## Deployment in EC2 Instance (t3.small) in AWS
<img width="2868" height="1528" alt="image" src="https://github.com/user-attachments/assets/ca182eb8-ae1c-4b38-a16c-5d934f9c4817" />


## Status & what's left

| Area | Status |
|---|---|
| UI, design system, accessibility, responsive layout | ✅ Done |
| Auth (credentials + Google), onboarding | ✅ Done |
| Catalog, Admin CMS with AI import/review | ✅ Done |
| Feeds, search, collections, watchlist, favourites | ✅ Done |
| Hybrid recommender, AI mode, roadmaps, smart collections, AI profile | ✅ Done |
| Communities, chat, DMs, friends, live analytics | ✅ Done |
| AI Match rooms, watch/listen parties, talk rooms (voice), group AI mode | ✅ Done |
| Catch me up (RAG recaps), Taste DNA history, Wrapped, in-hero trailers | ✅ Done |
| Daily limit (warning + lock until midnight) | ✅ Done |
| Notifications | 🟡 HTTP polling (not socket-pushed) |
| Media | 🟡 Trailers, previews and listen/watch links; full media only with licensed URLs |
| Voice at scale | 🟡 WebRTC mesh over public STUN — fine for small rooms; needs TURN/SFU for big groups |
| Automated tests, CI, deployment | 🔴 Not yet |

**Next up:** manual test pass of the AI and party screens → deployment (a host that runs `server.ts`) → automated tests and CI → socket-pushed notifications → TURN server for voice. Details, dates and every commit are in [project-roadmap.md](project-roadmap.md).

---

## License

Private project — all rights reserved.
