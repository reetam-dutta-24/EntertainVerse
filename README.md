# AniVerse

**AniVerse** is an AI-powered entertainment hub for anime, shows, K-dramas, films and music. You discover titles matched to your taste, with a reason for every pick. AI mode turns your mood into a time-budgeted roadmap of what to watch or listen to next. You build collections, join fan communities, message friends, and see how you watch and listen over time.

It's a full-stack Next.js application: PostgreSQL + Prisma, NextAuth (credentials + Google), **99 REST API routes**, Socket.IO realtime (community chat + DMs), a role-scoped admin CMS with AI-assisted import, and a hybrid deep-learning recommender built on Gemini.

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
| 💬 **Social & realtime** | Communities with posts and live chat, friends, DMs, collaborative collections. |
| 📊 **Analytics** | Personal watch/listen analytics from real events. |
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
| **Admin AI import & review** | Facts (episodes, cast, durations, members, artwork) mapped in code from metadata APIs; editorial fields drafted by the model; a second AI pass reviews the whole form, with one-click fixes and live progress. | Admin CMS |

**How it's built**

- **Embeddings:** every catalog item becomes a spoiler-free text (type, genres, tags, credits, synopsis), encoded by `gemini-embedding-001` (768 dimensions). Vectors live in `CatalogEmbedding` and are re-embedded only when an item's text changes; the sync runs after every admin save. The catalog is a few hundred items, so similarity search is an in-memory dot product — no vector database.
- **Grounded generation:** the LLM only ever picks from catalog IDs the recommender hands it (schema-enforced enums), so it can't recommend titles that don't exist. Facts are never generated — they come from metadata APIs.
- **Free-tier aware:** Gemini Flash for heavy work (falls back automatically to Flash-Lite when its ~20/day free quota runs out) and Flash-Lite for high-volume chat. Embeddings are paced to 100/min. Without any AI key, everything falls back to the taste engine.
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

> Use `npm run dev` / `npm start` (runs `tsx server.ts`). Plain `npm run dev:next` starts Next **without** Socket.IO — community chat and live DMs won't work.

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
   ├── Socket.IO ─────► server.ts ──► lib/socket/server.ts (community chat rooms, DM rooms)
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
| `lib/socket/**` | Realtime auth, rooms, broadcast |
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
   ├── Discover · For You · Watchlist · Collections (+ smart ideas) · Favourites
   ├── Analytics · Messages · Notifications · Community · Settings (+ What the AI knows)
   ├── Search (/search?q=…)
   └── Detail & play: /content/[id] (+ trailer, where to watch, /watch) · /song/[id] (+ preview, listen links)
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
| `/dashboard/discover` · `/dashboard/for-you` | Hybrid-ranked feeds + AI-mode launcher |
| `/dashboard/watchlist` · `/dashboard/favorites` | Library |
| `/dashboard/collections` | Collections hub + "AI made these for you" |
| `/dashboard/community` | Community hub |
| `/dashboard/analytics` | Personal analytics |
| `/dashboard/messages` · `/dashboard/notifications` | DMs · notifications |
| `/dashboard/settings` · `/dashboard/settings/ai` | Settings · What the AI knows |

### Detail & play

| Route | Description |
|---|---|
| `/content/[contentid]` | Title detail, official trailer, where to watch |
| `/content/[contentid]/watch` · `/watch/[episodeid]` | Player + watch events |
| `/song/[songid]` | Track detail, 30s preview, listen links |
| `/artist/[artistid]` · `/play` | Artist detail, listen links · artist play flow |
| `/collection/[collectionid]` · `/play` | Collection (content or music) · player |
| `/music-collection/[collectionid]` | Legacy redirect → `/collection/...` |
| `/profile/[userid]` · `/friends` | Profile · friends |
| `/community/[communityid]` · `/dashboard/[section]` | Community landing · in-community dashboard |

**Community sections:** `posts` · `chat` · `anime-chat` · `watch-channel` · `voice-channel` · `announcements` · `analytics` · `settings`

### Admin

| Route | Description |
|---|---|
| `/admin` | CMS overview |
| `/admin/{content,music,artists,collections,communities}` (+ `/new`, `/[id]/edit`) | Role-gated CRUD with AI import (content, music, artists), AI review and clear-form |

---

## API surface

99 route handlers under `app/api/**`, grouped:

| Group | Routes |
|---|---|
| **Auth** | `/api/auth/[...nextauth]` · `register` · `redirect-destination` · `clear-stale-session` |
| **Onboarding** | `/api/onboarding/profile` · `complete` · `recommendations` |
| **Users & social** | `/api/users/search` · `[handle]` (+ `follow`) · `me` (+ `settings`, `password`, `delete`) · `/api/friend-requests/[id]/accept|reject` |
| **Content** | `/api/content/[slug]/` `favorite` · `watchlist` · `reviews` · `view` · `watch-start` · `watch-event` · `engagement` |
| **Music & artists** | `/api/song/[slug]/favorite|reviews` · `/api/artist/[slug]/favorite|follow|play|reviews` |
| **Collections** | `/api/collections` (+ `[slug]`, `items`, `items/[itemId]`, `favorite`, `follow`, `play`, `collaborators`) |
| **Watchlist & reviews** | `/api/watchlist` (+ `[id]`) · `/api/reviews/[id]` (+ `like`) |
| **Communities** | create/list · `[slug]` · `join` · `join-code` · `join-by-code` · `invite-friends` · `members` · `posts` (+ `like`) · `chat` · `reviews` · `voice-channels` · `watch-channels` |
| **DMs** | `/api/dm/conversations` (+ `messages`, `read`) · `send` · `messages/[id]` · `unread` |
| **AI (users)** | `/api/ai/profile` (GET/PATCH/DELETE) · `profile/export` · `mode/chat` · `mode/picks` · `roadmaps` (GET/POST streaming) · `roadmaps/[id]` · `roadmaps/[id]/steps/[stepId]` · `smart-collections` (+ `[id]`) |
| **Admin** | `/api/admin/{content,music,artists,collections,communities}` (+ `[id]`) · `catalog-search` |
| **Admin AI** | `/api/admin/ai/{content,music,artists}/{search,import,review}` (import/review stream progress) |
| **Other** | `/api/search` (autocomplete) · `/api/upload` · `/api/analytics` · `/api/notifications` (+ `[id]`) |

---

## Data model

51 Prisma models across 28 additive migrations.

| Domain | Models |
|---|---|
| **Identity** | `User`, `Account`, `TasteProfile`, `UserPreferences` |
| **Catalog** | `Content` (+ `ContentSeason`, `ContentEpisode`, `ContentCharacter`, `ContentFeaturedTrack`, `ContentRelated`), `MusicTrack`, `Artist`, `ArtistMember`, `Genre`, `ContentGenre`, `CatalogReview` |
| **Library** | `WatchlistItem`, `Collection` (+ `CollectionItem`, `CollectionFavorite`, `CollectionFollow`, `CollectionCollaborator`), `ContentFavorite`, `ArtistFavorite`, `ArtistFollow`, `TrackFavorite` |
| **Social** | `UserFollow`, `FriendRequest`, `Community` (+ members, posts, likes, chat messages, voice/watch channels and members), `Review`, `ReviewLike` |
| **Messaging** | `DirectConversation`, `DirectMessage`, `DirectConversationRead` |
| **Activity** | `Notification`, `Rating`, `WatchEvent`, `ListenEvent` |
| **AI** | `CatalogEmbedding`, `AiTasteProfile`, `AiRoadmap`, `AiRoadmapStep`, `AiCollectionSuggestion` |

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
| Analytics | Charts | `analytics.service` | events + ratings | — |

**Media behaviour**

- Title pages show the official trailer (click-to-load, `youtube-nocookie`) and live streaming providers for `WATCH_REGION`.
- Players use full audio when an admin sets a licensed `audioUrl`, then the official 30s preview, then a demo track (badged).
- Voice and watch channels store membership and metadata only — live A/V is a stretch goal.

---

## Project structure

```
aniverse-application/
├── app/
│   ├── (auth)/                  # login, signup
│   ├── admin/                   # role-gated CMS
│   ├── api/                     # 99 REST route handlers (incl. api/ai, api/admin/ai)
│   ├── dashboard/               # hubs, ai-mode (+ roadmap), settings (+ ai)
│   └── content|song|artist|collection|community|profile|search|onboarding/
├── components/
│   ├── ai-mode/                 # quiz, chat, results, roadmap board, spotlight, launcher
│   ├── admin/ (+ ai/)           # CMS forms, AI import/review panels
│   ├── cards/ · dashboard/ · collections/ · community/ · settings/ · …
├── hooks/                       # AI task progress, drafts, chat, layout helpers
├── lib/
│   ├── ai/                      # provider layer (Gemini/Claude), imports, reviews, chat, roadmap planner
│   ├── ai-profile/              # AI-mode vocabulary, schemas, quiz, summaries (client-safe)
│   ├── recommender/             # embeddings, hybrid scoring, social ranking
│   ├── roadmap/                 # runtime estimates, view types
│   ├── catalog-import/          # TMDB, AniList, iTunes, Deezer, MusicBrainz clients
│   ├── services/ · data/ · mappers/ · validators/ · socket/
│   └── auth.ts · auth-guards.ts · api-auth.ts · admin-auth.ts
├── prisma/                      # schema.prisma, seed.ts, migrations/
├── scripts/                     # embed-catalog, eval-recommender, seed-active-profile, image installers, checks
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

## Status & what's left

| Area | Status |
|---|---|
| UI, design system, accessibility, responsive layout | ✅ Done |
| Auth (credentials + Google), onboarding | ✅ Done |
| Catalog, Admin CMS with AI import/review | ✅ Done |
| Feeds, search, collections, watchlist, favourites | ✅ Done |
| Hybrid recommender, AI mode, roadmaps, smart collections, AI profile | ✅ Done |
| Communities, chat, DMs, friends, analytics | ✅ Done |
| Notifications | 🟡 HTTP polling (not socket-pushed) |
| Media | 🟡 Trailers, previews and listen/watch links; full media only with licensed URLs |
| Voice channels / watch parties | 🔴 Shells only (no WebRTC / synced playback) |
| Automated tests, CI, deployment | 🔴 Not yet |

**Next up:** manual test pass of the AI screens → deployment (a host that runs `server.ts`) → automated tests and CI → socket-pushed notifications → live voice and watch parties. Details, dates and every commit are in [project-roadmap.md](project-roadmap.md).

---

## License

Private project — all rights reserved.
