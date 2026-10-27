# EntertainVerse

**EntertainVerse** is an AI-powered entertainment hub for anime, shows, K-dramas, films and music. You discover titles matched to your taste, with a reason for every pick. AI mode turns your mood into a time-budgeted roadmap of what to watch or listen to next. AI Match opens rooms with people who share your taste. Every community has live watch parties, listen parties and voice talk rooms. You can also:

- ask for a spoiler-safe recap before you continue a show
- see your Taste DNA change month by month
- get a Spotify-style Wrapped of your year
- ask the in-app assistant anything about the app

It is a full-stack Next.js application:

- **Data and auth:** PostgreSQL + Prisma, and NextAuth (credentials + Google).
- **API:** 112 REST route handlers.
- **Realtime:** Socket.IO (community chat, DMs, presence, synced parties, WebRTC signalling).
- **Admin:** a role-scoped CMS with AI-assisted import.
- **AI:** a hybrid recommender built on Gemini embeddings, and retrieval-augmented generation (RAG) for recaps, roadmaps and the assistant.
- **Production:** it runs on **two servers behind an AWS load balancer**, with Redis, S3, health checks and graceful shutdown. It is tested end to end against that layout.

> **Why it exists:** people pay for several streaming apps and still lose 20 minutes scrolling. They don't know what to watch next, or in what order. EntertainVerse answers *what*, *why* and *in what order*.

🌐 **Live demo:** https://showed-automotive-opinions-travelling.trycloudflare.com

> The demo runs on demand to keep AWS costs down. Each time the servers are started, the free HTTPS tunnel gets a **new address**, so this link only works while that demo is up. If it doesn't load, the demo is off; ask for a fresh link. Sign in with a demo account from [Seeded accounts](#seeded-accounts), e.g. `reetam@entertainverse.local` / `User123!`.

📍 **Full history, architecture deep dive, decisions, bugs and interview notes:** [project-roadmap.md](project-roadmap.md)

---

## Contents

- [Highlights](#highlights)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Architecture](#architecture)
- [Running on several servers](#running-on-several-servers)
- [Testing](#testing)
- [Deployment (AWS)](#deployment-aws)
- [Routes](#routes)
- [API surface](#api-surface)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Design system](#design-system)
- [Status](#status)

---

## Highlights

| | |
|---|---|
| 🎯 **Hybrid recommender** | Explicit taste + semantic embeddings (`gemini-embedding-001`) + collaborative filtering + watch/listen history. Every card says *why*. |
| ✨ **AI mode & roadmaps** | Watch or Listen: a taste quiz or a chat gives explained picks, then an ordered plan that fits your weekly hours and ticks off as you watch. |
| 📒 **Smart collections** | Weekly collection ideas learned from your behaviour. Save or dismiss. |
| 💬 **Assistant** | Ask anything in the app shell. RAG over 28 help articles, the catalog and your own stats, with cited sources. |
| 🛠️ **AI-assisted admin CMS** | Import titles, songs and artists from TMDB, AniList, Apple Music, Deezer and MusicBrainz, with an AI review before publishing. |
| 🎬 **Legal media** | Official trailers, "where to watch" (JustWatch via TMDB), official 30-second previews and listen links. |
| 🤝 **AI Match rooms** | Open a room, and everyone whose taste matches (nearby, in your country or worldwide) gets a popup invite. |
| 🍿 **Watch, listen & talk** | Synced watch and listen parties. The host can go live with their screen or camera. Voice talk rooms (WebRTC). Group picks that suit everyone. |
| 🧠 **Catch me up** | A recap of only what you've seen, grounded in episode guides or the web (RAG). |
| 🧬 **Taste DNA & Wrapped** | Your taste traits month by month, and a story of your year with an AI-named persona and a share card. |
| 💬 **Social & realtime** | Communities with posts and live chat; friends; DMs with online status, typing, edits and deletes; collaborative collections. |
| 📊 **Live analytics** | Watch/listen time, taste fit, rhythm and traits from real activity. |
| ⏳ **Daily limit** | A 5-minute warning, then the app locks until midnight. |
| 🔐 **You own your data** | See, edit, download or wipe what the AI knows; switch off learning. |
| ♿ **Accessible & responsive** | 0 axe violations and 0 px horizontal overflow on every route from 320 px to desktop. |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Server Components) + a custom `server.ts` |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Framer Motion, Lucide, CVA |
| Auth | [NextAuth.js v5](https://authjs.dev): JWT sessions; credentials, Google (Discord wired) |
| Database | PostgreSQL 16 + Prisma 6 |
| Realtime | Socket.IO 4 (`/api/socket/io`) + the Redis adapter; WebRTC for voice and live hosting |
| Shared state | Redis 7: Socket.IO adapter, party state, cache invalidation, rate limits (optional on one server) |
| File storage | Local `public/` or Amazon S3 (`@aws-sdk/client-s3`) |
| Validation | Zod 4 |
| AI | Google Gemini via `@google/genai` (Flash, Flash-Lite, `gemini-embedding-001`); Anthropic Claude optional |
| Metadata APIs | TMDB, AniList, Apple Music (iTunes Search), Deezer, MusicBrainz, JustWatch (via TMDB) |
| Testing | Vitest + Testing Library; Playwright (+ axe-core) |
| Delivery | Docker (multi-stage), GitHub Actions (CI + GHCR images), AWS EC2 + ALB + S3 |

> Use `npm run dev` / `npm start` (runs `tsx server.ts`). Plain `npm run dev:next` starts Next **without** Socket.IO, so chat, live DMs, parties and talk rooms won't work.

---

## Getting started

### Prerequisites

- Node.js 20+ (the Docker image uses 22)
- PostgreSQL on `localhost:5432` (or any `DATABASE_URL`)
- Redis and S3 are **not** needed locally. Without them the app runs as a single server with memory and disk.

### 1. Install and configure

```bash
npm install
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `AUTH_SECRET` | Yes | JWT signing (`npx auth secret`); `NEXTAUTH_SECRET` is also accepted |
| `AUTH_URL` / `NEXTAUTH_URL` | Yes | Public URL, e.g. `http://localhost:3000` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` / `ADMIN_HANDLE` | Seed | Super-admin account created by the seed |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Google sign-in (redirect URI `<url>/api/auth/callback/google`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Optional | Discord sign-in |
| `GEMINI_API_KEY` | Recommended | All AI features. A free key comes from [Google AI Studio](https://aistudio.google.com/apikey). |
| `AI_PROVIDER` | Optional | `gemini` (default) or `claude` |
| `GEMINI_MODEL` / `GEMINI_FAST_MODEL` | Optional | Override `gemini-flash-latest` / `gemini-flash-lite-latest` |
| `ANTHROPIC_API_KEY` | Optional | Claude as the provider (paid) |
| `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` | Optional | Movie/show import, trailers, "where to watch" |
| `WATCH_REGION` | Optional | Country for providers, previews and listen links (default `IN`) |
| `NEXT_PUBLIC_APP_URL` | Production | Public URL; also the Socket.IO CORS origin |
| `REDIS_URL` | Several servers | Turns on the Socket.IO adapter, shared party state, cache sync and shared rate limits |
| `S3_BUCKET` / `S3_REGION` | Several servers | Uploads go to S3 instead of `public/` (credentials come from the AWS SDK chain, e.g. an instance role) |
| `S3_ENDPOINT` | Optional | An S3-compatible server in development (e.g. S3Mock) |
| `SERVER_NAME` | Optional | Shown by `/api/health`, so you can tell servers apart |
| `SHUTDOWN_DRAIN_MS` | Optional | How long to keep serving after SIGTERM (default 10 000 in production, 0 in dev) |
| `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL` | Optional | TURN relay for voice and live hosting on strict networks |
| `SERVER_CACHE` | Optional | `off` bypasses the server cache (debugging) |

Never commit `.env.local`. AI and API keys are only read on the server.

### 2. Database and AI setup

```bash
npm run db:migrate      # or: npx prisma migrate deploy
npm run db:seed
npm run embed:catalog   # once, after adding GEMINI_API_KEY (~2 min on the free tier)
```

### 3. Run

```bash
npm run dev             # http://localhost:3000
```

### Seeded accounts

| Role | Login |
|---|---|
| Super admin | `admin@entertainverse.local` / `Admin123!` (or your `ADMIN_*` values) |
| Content admin | `content@entertainverse.local` / `Content123!` |
| Music admin | `music@entertainverse.local` / `Music123!` |
| Artist admin | `artist@entertainverse.local` / `Artist123!` |
| Demo users | `reetam@`, `aisha@`, `vikram@entertainverse.local` / `User123!` |

**Roles:** `USER` · `CONTENT_ADMIN` · `MUSIC_ADMIN` · `ARTIST_ADMIN` · `SUPER_ADMIN`

### Troubleshooting

- **`prisma generate` fails with `EPERM` on Windows:** stop `npm run dev`, regenerate, then restart.
- **`next build` fails inside `.next/dev/types/...`:** a dev server left a half-written file. Restart `npm run dev`.
- **Google sign-in "AccessDenied":** usually PostgreSQL isn't running.
- **TMDB unreachable in India:** the app already uses `api.tmdb.org`, because `api.themoviedb.org` is ISP-blocked.
- **"Free-tier limit reached":** Flash allows about 20 requests/day. The app falls back to Flash-Lite automatically.
- **Talk room connects but there's no audio between networks:** set a TURN server (`TURN_URLS`, …).

---

## Architecture

```
Browser
  ├── RSC pages ─────► app/**/page.tsx ─► lib/data/** ─► lib/services/** ─► Prisma ─► PostgreSQL
  ├── REST ──────────► app/api/**/route.ts (Zod, auth) ─► lib/services/**
  │                         └─ AI routes ─► lib/ai/** · lib/recommender/** · lib/assistant/**
  ├── NDJSON streams ◄─ long AI tasks (imports, reviews, roadmaps, recaps, assistant)
  └── Socket.IO ─────► server.ts ─► lib/socket/server.ts   (auth, chat, DMs)
                                     lib/socket/parties.ts  (parties, talk rooms, live hosting)
                                     lib/socket/presence.ts (online status, typing)
                                         │
                       Redis (optional) ─┘ adapter · shared store · cache sync · rate limits
```

| Layer | Responsibility |
|---|---|
| `app/**/page.tsx` | Routes, layouts, server data loading |
| `app/api/**/route.ts` | REST handlers: validate, authorise, call a service |
| `components/**` | UI by domain. Client components never import server modules (enforced by a test). |
| `lib/services/**` | Business logic (40 services); the only layer that uses Prisma |
| `lib/data/**` · `lib/mappers/**` · `lib/validators/**` | Page accessors · DB → view models · Zod schemas |
| `lib/cache/**` | Per-server cache (TTL + stale-while-revalidate, single-flight, tags, LRU). Writes invalidate it automatically through a Prisma extension, and invalidations are shared through Redis. |
| `lib/ai/**` · `lib/recommender/**` · `lib/assistant/**` | LLM providers, recommender maths, RAG |
| `lib/socket/**` · `lib/redis.ts` · `lib/rate-limit.ts` | Realtime, shared state, rate limiting |
| `lib/file-storage.ts` | Disk or S3 uploads behind one interface |
| `prisma/schema.prisma` | Source of truth for the data model |

**Recommender:** `score = 0.50 × taste engine + 0.35 × semantic similarity (embeddings) + 0.15 × collaborative co-occurrence`. History decays with a 30-day half-life. In an offline leave-one-out test, the full hybrid scored **MRR@20 0.350**, against 0.203 for a popularity baseline ([docs/recommender-evaluation.md](docs/recommender-evaluation.md)).

---

## Running on several servers

The same build runs as one server (local dev) or several behind a load balancer. Setting `REDIS_URL` and `S3_BUCKET` switches on the shared pieces:

| Concern | Single server | Several servers |
|---|---|---|
| Socket.IO emits | In process | Redis adapter: an emit reaches users on every server |
| Party / talk-room state | Memory | Redis store with locked read-modify-write and a TTL |
| Server cache | Local invalidation | Invalidations published on Redis pub/sub |
| Online status | Local socket counts | Asks every server before announcing "offline" |
| Rate limits | Memory | Redis sorted-set sliding window |
| Uploads | `public/uploads` | S3, served through `/uploads/...` |

- **`GET /api/health`** checks the database and Redis (2 s timeout each). It returns `200 {status:"ok", server, checks}`, or `503` when unhealthy or draining.
- **On SIGTERM**, the server fails its health check, keeps serving for `SHUTDOWN_DRAIN_MS`, then closes its sockets. Browsers reconnect to the other server and rejoin their rooms, so parties keep their host, position and members.

---

## Testing

| Suite | Command | What |
|---|---|---|
| Unit | `npm test` | **449 tests** (Vitest): services with a Prisma mock, recommender maths, cache and invalidation, the shared store, rate limits, file storage, auth helpers, hooks, health route, and an architecture test for client/server imports |
| E2E | `npm run test:e2e` | Playwright against a production build: auth flows (including the open-redirect guard and the sign-out race), mobile layout and navigation |
| E2E, two servers | `npm run test:e2e:stack` | Builds the Docker image and runs nginx + 2 app servers + Postgres + Redis + S3 mock. Tests cross-server DMs, party sync, shared uploads and cache clearing, then **stops a server mid-party (failover)**. Add `-- --keep` to leave it at `http://localhost:8080`. |

**CI** (`.github/workflows/ci.yml`) runs typecheck → lint → unit tests → build, plus the E2E job, on every push and PR. `.github/workflows/docker.yml` builds the image and pushes it to GHCR (`:latest` and `:<commit-sha>`) on every push to `main`.

---

## Deployment (AWS)

```
Browser ─HTTPS─► Cloudflare quick tunnel ─► ALB (HTTP :80, sticky, /api/health)
                                              ├─► Server A  app + Postgres + Redis   (t3.small, zone 2b)
                                              └─► Server B  app                     (t3.small, zone 2a)
                                                       uploads ─► S3 (via IAM role)
```

| Piece | Where |
|---|---|
| Image | `Dockerfile`: multi-stage, `node:22-bookworm-slim`, non-root, `HEALTHCHECK`, Node as PID 1 for clean SIGTERM. Builds without a database. |
| Registry | `ghcr.io/reetam-dutta-24/entertainverse`, built by GitHub Actions |
| Server config | `deploy/server-a.compose.yml`, `deploy/server-b.compose.yml`, and `deploy/env.example` (copied to `~/entertainverse/` on each server) |
| Networking | Port 3000 only from the ALB's security group. Postgres and Redis bound to A's private IP and open only to the app servers. The S3 bucket is private and reached through an instance role. |
| On demand | `.\deploy\up.ps1` starts the servers, creates the ALB, opens an HTTPS quick tunnel, points the apps at its URL, and waits until both targets are healthy. `.\deploy\down.ps1` deletes the ALB and stops the servers. |

To ship a new version: push to `main`, then on each server (one at a time) run `docker compose pull && docker compose up -d`. If the schema changed, first run `docker compose run --rm app npx prisma migrate deploy` on server A.

Full walkthrough, AWS resources, runbook and limits: [project-roadmap.md §11](project-roadmap.md#11-containers-and-production-on-aws).

<img width="2868" height="1528" alt="EntertainVerse running on AWS EC2" src="https://github.com/user-attachments/assets/ca182eb8-ae1c-4b38-a16c-5d934f9c4817" />

---

## Routes

### Public

| Route | Description |
|---|---|
| `/` | Landing |
| `/login` · `/signup` | Credentials + Google |
| `/search?q=` | Ranked search results |

### App (signed in)

| Route | Description |
|---|---|
| `/onboarding` | Taste quiz |
| `/dashboard` | Home: AI-mode spotlight, feeds, communities, collections |
| `/dashboard/ai-mode` (+ `/roadmap`, `/match`) | AI mode · roadmaps · AI Match |
| `/dashboard/discover` · `/dashboard/for-you` | Hybrid-ranked feeds |
| `/dashboard/watchlist` · `/dashboard/favorites` · `/dashboard/collections` | Library |
| `/dashboard/community` · `/dashboard/messages` · `/dashboard/notifications` | Social |
| `/dashboard/analytics` · `/dashboard/wrapped` | Analytics + Taste DNA · Wrapped |
| `/dashboard/settings` (+ `/ai`) | Settings, daily limit · what the AI knows |

### Detail and play

| Route | Description |
|---|---|
| `/content/[id]` (+ `/watch`, `/watch/[episode]`) | Title page (in-hero trailer, Catch me up, where to watch) · player |
| `/song/[id]` · `/artist/[id]` (+ `/play`) | Track (preview, listen links) · artist |
| `/collection/[id]` (+ `/play`) | Collection · player |
| `/profile/[handle]` (+ `/friends`) | Profile · friends |
| `/community/[id]` (+ `/dashboard/[section]`) | Community landing · dashboard: `posts`, `chat`, `anime-chat`, `watch-channel`, `listen-party`, `voice-channel`, `announcements`, `analytics`, `settings` |

### Admin

`/admin`, and `/admin/{content,music,artists,collections,communities}` (+ `/new`, `/[id]/edit`): role-gated CRUD with AI import and AI review.

---

## API surface

112 route handlers under `app/api/**`, plus `/uploads/[...path]`:

| Group | Routes |
|---|---|
| **Auth** | `/api/auth/[...nextauth]` · `register` · `redirect-destination` · `clear-stale-session` |
| **Onboarding** | `/api/onboarding/profile` · `complete` · `recommendations` |
| **Users & social** | `/api/users/search` · `[handle]` (+ `follow`) · `me` (+ `settings`, `password`, `delete`) · `/api/friend-requests/[id]/accept\|reject` |
| **Content, music, artists** | `/api/content/[slug]/` `favorite` · `watchlist` · `reviews` · `view` · `watch-start` · `watch-event` · `engagement` · `recap` · `/api/song/[slug]/…` · `/api/artist/[slug]/…` |
| **Collections & watchlist** | `/api/collections` (+ items, favourite, follow, play, collaborators) · `/api/watchlist` · `/api/reviews/[id]` (+ `like`) |
| **Communities** | create/list · `[slug]` · join (+ by code) · invite · members · posts · chat · reviews · voice/watch channels · `group-picks` |
| **DMs** | `/api/dm/conversations` (+ messages, read) · `send` · `messages/[id]` · `unread` |
| **AI** | `/api/ai/profile` (+ export) · `mode/chat` · `mode/picks` · `roadmaps` (+ steps) · `smart-collections` · `/api/assistant/chat` (streamed, rate-limited) |
| **AI Match** | `/api/match/profile` · `rooms` (+ join, decline, seen, leave) · `invites` |
| **Admin** | `/api/admin/{content,music,artists,collections,communities}` · `catalog-search` · `/api/admin/ai/{content,music,artists}/{search,import,review}` |
| **Platform** | `/api/health` · `/api/realtime/ice` · `/api/internal/warm` (token-guarded) · `/api/upload` · `/api/search` · `/api/analytics` · `/api/notifications` · `/api/screen-time` (+ `heartbeat`) |

**Socket.IO events:**

| Area | Events |
|---|---|
| Chat | `chat:join\|leave\|send\|typing` |
| DMs | `dm:join\|leave\|typing` |
| Presence | `presence:watch` |
| Parties | `party:join\|leave\|control\|chat\|reaction` |
| Live hosting | `live:start\|stop\|request\|signal` |
| Talk rooms | `voice:join\|signal\|state\|leave` |

---

## Data model

57 Prisma models and 10 enums across 35 additive migrations.

| Domain | Models |
|---|---|
| **Identity** | `User`, `Account`, `TasteProfile`, `UserPreferences` |
| **Catalog** | `Content` (+ seasons, episodes, characters, featured tracks, related), `MusicTrack`, `Artist`, `ArtistMember`, `Genre`, `ContentGenre`, `CatalogReview` |
| **Library** | `WatchlistItem`, `Collection` (+ items, favourites, follows, collaborators), content/artist/track favourites, `ArtistFollow` |
| **Social** | `UserFollow`, `FriendRequest`, `Community` (+ members, posts, likes, chat, voice/watch channels), `Review`, `ReviewLike` |
| **Messaging** | `DirectConversation`, `DirectMessage`, `DirectConversationRead` |
| **Activity** | `Notification`, `Rating`, `WatchEvent`, `ListenEvent` |
| **AI** | `CatalogEmbedding`, `AiTasteProfile`, `AiRoadmap`, `AiRoadmapStep`, `AiCollectionSuggestion`, `AiRecap` |
| **AI Match** | `MatchProfile`, `MatchCircle`, `MatchCircleMember` |
| **Wellbeing** | `ScreenTimeSettings`, `ScreenTimeDay` |

---

## Project structure

```
├── app/                    # pages, layouts, 112 API route handlers, /uploads route
├── components/             # UI by domain (ai-mode, party, wrapped, admin, cards, …)
├── hooks/                  # carousel autoplay, column count, AI task progress, …
├── lib/
│   ├── ai/ · ai-profile/ · recommender/ · assistant/ · roadmap/ · recap/ · wrapped/
│   ├── socket/             # Socket.IO server, parties, presence, Redis adapter, shared store
│   ├── cache/              # server cache, Prisma invalidation extension, cross-server sync
│   ├── services/ · data/ · mappers/ · validators/
│   ├── catalog-import/     # TMDB, AniList, iTunes, Deezer, MusicBrainz clients
│   ├── file-storage.ts · redis.ts · rate-limit.ts · server-lifecycle.ts · auth.ts
├── prisma/                 # schema.prisma, seed.ts, 35 migrations
├── tests/                  # unit/ (Vitest), e2e/ (Playwright), helpers/
├── scripts/                # embed-catalog, eval-recommender, e2e-stack, seed helpers, …
├── deploy/                 # production compose files, env template, up/down scripts
├── docker/                 # nginx config for the two-server test stack
├── .github/workflows/      # ci.yml, docker.yml
├── Dockerfile · docker-compose.e2e.yml
├── middleware.ts           # guards /dashboard, /onboarding, /admin
├── server.ts               # Next + Socket.IO + graceful shutdown
└── project-roadmap.md      # history, deep dive, decisions, interview notes
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` / `npm start` | Next + Socket.IO (`tsx server.ts`) |
| `npm run dev:next` | Next only (no Socket.IO) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` · `npm run test:coverage` | Unit tests · with coverage |
| `npm run test:e2e` | Single-server E2E (resets and seeds a dedicated test database) |
| `npm run test:e2e:stack` | Two-server E2E in Docker |
| `npm run db:migrate` · `db:generate` · `db:studio` | Prisma |
| `npm run db:seed` · `db:reset` · `db:recovery` | Seed, wipe-and-reseed, recovery seed |
| `npm run embed:catalog` | Embed the catalog (incremental; `-- --force` to redo all) |
| `npm run eval:recommender` | Offline evaluation → `docs/recommender-evaluation.md` |
| `npm run backfill:trailers` | Link TMDB ids and official trailers |
| `npx tsx scripts/seed-match-demo.ts` | Demo users with AI Match profiles |
| `npx tsx scripts/seed-active-profile.ts` | Fill an account with realistic activity |

---

## Design system

Tokens live in `app/globals.css` (Tailwind v4 `@theme`). Use them instead of arbitrary values.

| Token | Rule |
|---|---|
| **Radius** | `lg` 8 · `xl` 12 · `2xl` 16 · `card` 20 · `3xl` 24 · `full`. Same component type, same radius. |
| **Type** | `micro` 11 · `caption` 12 · `small` 13 · `body` 15 · `subtitle` 16 · `lead` 18 · `heading` 24 · `title` 32 · `display` 64. Nothing readable below 12 px. |
| **Colour** | Brand `brand-purple → brand-fuchsia → brand-magenta`, accent `brand-pink`. All text meets WCAG AA contrast. |
| **Glow** | One soft halo, reserved for the primary CTA, active nav, now-playing and card hover |
| **Layout** | Mobile-first, 320 px → desktop. Dashboard pages: `max-w-[1200px]`, `gap-5 sm:gap-6`, `px-4 sm:px-6 lg:px-8`. Drawer + bottom nav below `lg`. |

---

## Status

| Area | Status |
|---|---|
| Product features (discovery, AI, social, realtime, admin, wellbeing) | ✅ Done |
| Accessibility & responsive (axe + 5 widths, every route) | ✅ 0 violations, 0 overflow |
| Unit tests, E2E, two-server E2E with failover, CI | ✅ Done |
| Multi-server readiness (Redis, S3, health, graceful shutdown) | ✅ Done |
| Docker image + GHCR | ✅ Done |
| AWS production (2 × EC2, ALB, S3, on-demand `up` / `down`) | ✅ Live on demand |
| Notifications | 🟡 Polled over HTTP (DMs and chat are pushed) |
| Data tier | 🟡 Postgres and Redis on one server; no automated backups |
| HTTPS | 🟡 Cloudflare quick tunnel: the URL changes every demo, so Google sign-in is off in production |
| Voice at scale | 🟡 WebRTC mesh (≤ 8 per room); TURN supported but not configured in production |

Trade-offs, limits and what's next: [project-roadmap.md §14–15](project-roadmap.md#14-trade-offs-and-honest-limits).

---

## License

Private project. All rights reserved.
