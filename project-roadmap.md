# EntertainVerse: Project Roadmap & Study Guide

This file covers the whole project: what EntertainVerse is, how it was built and in what order, how every part works, which decisions were made and why, the bugs that taught something, and the limits that are still there. It also works as interview preparation: [section 13](#13-interview-preparation) has the questions this project invites, with answers.

For setup and the quick reference (routes, scripts, environment variables), see [README.md](README.md).

**Last updated:** 27 October 2026
**Status:** feature-complete, tested on two servers, and deployed to AWS. The site runs on demand: `deploy/up.ps1` starts it and `deploy/down.ps1` stops it.

---

## Contents

1. [The product in one page](#1-the-product-in-one-page)
2. [Numbers](#2-numbers)
3. [Timeline: how it was built](#3-timeline-how-it-was-built)
4. [Architecture](#4-architecture)
5. [Data, auth and security](#5-data-auth-and-security)
6. [The server cache](#6-the-server-cache)
7. [Realtime: chat, DMs, presence, parties, voice](#7-realtime-chat-dms-presence-parties-voice)
8. [AI: recommender, AI mode, RAG](#8-ai-recommender-ai-mode-rag)
9. [From one server to many](#9-from-one-server-to-many)
10. [Testing and CI](#10-testing-and-ci)
11. [Containers and production on AWS](#11-containers-and-production-on-aws)
12. [Bugs that taught something](#12-bugs-that-taught-something)
13. [Interview preparation](#13-interview-preparation)
14. [Trade-offs and honest limits](#14-trade-offs-and-honest-limits)
15. [What I would do next](#15-what-i-would-do-next)
16. [Glossary](#16-glossary)
17. [Command cheat sheet](#17-command-cheat-sheet)

---

## 1. The product in one page

| | |
|---|---|
| **What it is** | An AI-powered entertainment hub for anime, shows, K-dramas, films and music. You discover, plan, collect, discuss and watch together. |
| **The problem** | People pay for several streaming services and still lose 20 minutes scrolling. They don't know what to watch next, or in what order. |
| **The answer** | A hybrid recommender that explains every pick. *AI mode* turns your mood into a time-budgeted roadmap that tracks itself. A social layer adds AI Match rooms, synced watch and listen parties, voice talk rooms, and group picks that suit everyone. |
| **Who it is for** | Fans who watch across services and want one place to decide, plan and share. |
| **Legal stance** | No scraped video or audio and no lyrics. Only official trailers, official 30-second previews, and "where to watch / listen" links to licensed services. |

**The features, grouped:**

- **Discover**
  - Home, For You and Discover feeds, ranked by the hybrid recommender, with a "why this" reason on every card.
  - Global search.
  - Title, song, artist, collection and profile pages.
- **AI**
  - AI mode: a quiz or chat, then explained picks.
  - AI roadmaps: ordered plans that fit your weekly hours and tick off as you watch.
  - Smart collections: weekly collection ideas.
  - Social recommendations: public collections and communities that fit your taste.
  - Group picks inside parties.
  - Catch me up: spoiler-safe recaps (RAG).
  - Taste DNA history, and Wrapped (a Spotify-style year in review).
  - The in-app assistant (RAG over help articles, the catalog and your own data).
- **Library:** watchlist, favourites, and collections. Collections can be content or music, public or private, shared with collaborators, followed, and played in a player.
- **Social and realtime**
  - Communities with posts, announcements, live chat, typing indicators and join codes.
  - Friends and DMs, with live delivery, online status, typing, and edits and deletes.
  - AI Match rooms.
  - Watch parties, including the host going live with their screen or camera.
  - Listen parties and voice talk rooms (WebRTC).
- **Admin CMS:** five areas with role-scoped access. AI import from TMDB, AniList, Apple Music, Deezer and MusicBrainz, and an AI review pass before publishing.
- **Wellbeing and data control:**
  - A daily screen-time limit that locks the app until midnight.
  - "What the AI knows": view, edit, download or wipe your AI profile, or switch off learning.

---

## 2. Numbers

| | |
|---|---|
| Pages | 51 |
| API route handlers | 112 under `app/api`, plus `/uploads/[...path]` |
| Prisma models / enums / migrations | 57 / 10 / 35 |
| React components | 261 files |
| `lib/` modules | 171 TypeScript files, including 40 services |
| Unit tests | 449 tests in 33 files (Vitest), about 17 s |
| E2E tests | Playwright: auth, mobile layout, plus multi-server and failover suites run against a two-server stack |
| Commits | 142, from 11 Jul 2026 to 27 Oct 2026 |
| Production | 2 × EC2 t3.small (ap-southeast-2), an Application Load Balancer, S3, and GHCR images |
| Seeded catalog (production) | 99 titles, 64 tracks, 16 artists, 5 communities, 5 collections, 7 accounts |
| Assistant knowledge base | 28 help articles |

**Measured improvements** (from the commits that made them):

| What | Before → after |
|---|---|
| Home page data, cache warm | 131 ms / 171 queries → 31 ms / 26 queries |
| For You | 307 ms → 4 ms |
| Analytics | 284 ms → 14 ms |
| Hero images | 3.0 MB PNG → 336 KB WebP |
| Accessibility violations (axe, every route) | aria-hidden-focus 383, target-size 184, color-contrast 111 → **0** |
| Horizontal overflow at 320/375/412/768/1024 px | up to 440 px on some pages → **0 px on every route** |
| Recommender, titles, MRR@20 | popularity baseline 0.203 → full hybrid **0.350** |

---

## 3. Timeline: how it was built

### Phase 1: Foundation and frontend (11–14 Jul)

| What | Commits |
|---|---|
| Next.js project, Tailwind design tokens (colours, type, fonts), shared buttons, chips and cards | `6d6eb8f` `5781fb7` |
| Landing, auth pages and every dashboard page, responsive; carousel and paginated grid sections | `d78d24c` |
| Detail routes: content, song, artist, collection, profile, community, and the community dashboard | `db55e04` `21193a0` |
| Global search in the navbar plus a results route; landing reviews slider; onboarding, settings and analytics pages | `a6ff000` `a433b82` `6e0b7da` |

### Phase 2: Backend, auth and admin CMS (14–16 Jul)

| What | Commits |
|---|---|
| Prisma schema on PostgreSQL, register/login APIs, NextAuth JWT sessions, middleware guarding the dashboard | `7323194` |
| Admin roles and the CMS, then three scoped admins (content, music, artist) with CRUD APIs; catalog read from the database | `9875b84` `ba44eb3` |
| User CRUD for communities, collections and watchlist; catalog search picker in forms; collection play route | `fc3aa2d` `94d437b` `31b4f3a` |
| Community dashboard CRUD and the first Socket.IO chat | `6de65f9` |
| Profile, reviews and notifications APIs; analytics from real events | `b80dfc8` `52b772b` `cab7594` |

### Phase 3: Real data and social (16–23 Jul)

| What | Commits |
|---|---|
| Hundreds of catalog items through the CMS, real descriptions with source links, manual end-to-end testing | `c7324c9` `3692264` `e3f5f3b` `276cd4f` `14ebbbc` |
| Per-role admin testing; collection follows, filters, synced lyrics, accent "ambience" on players | `2759288` |
| Profile overhaul, friend requests, private-community join codes; first Google sign-in work | `d86f996` `c9606a9` |

### Phase 4: Finishing pass (24 Oct)

Google sign-in went live, onboarding was rebuilt, and skeletons and error pages were added everywhere. The phase also brought a design system (one radius scale, type scale and glow budget), accessibility basics, shared confirm and toast components, honest "Coming soon" labels, and zero type and lint errors (`0aec15e` → `4bcfc4f`).

### Phase 5: AI-assisted admin CMS (24–25 Oct)

- **AI catalog import with a review pass:** facts are mapped in code from metadata APIs, the model drafts the editorial fields, and a second AI pass reviews the whole form (`10d92da`).
- **Pluggable provider:** Gemini by default (free tier), Claude optional (`48eda59`).
- **Live import progress:** percentages streamed as NDJSON (`14c24b8`).
- **Legal media:** official trailers and "where to watch" (`07ba038`).
- **Music and artist import:** previews and listen links (`8a41f4a` `2679f0c`).

### Phase 6: AI for users (25 Oct)

The hybrid recommender with "why this" reasons (`7ec5d93`) → AI taste profile under user control (`d3df271`) → AI mode (`99b9a16`) → AI roadmaps (`85c0248`) → social recommendations (`422ccac`) → smart collections (`97bc3bf`) → offline evaluation (`3f4c3a1`).

### Phase 7: Social AI and live parties (25 Oct)

| Step | What | Commit |
|---|---|---|
| 1 | Deeper taste quiz | `91914c6` |
| 2 | Strict daily limit | `65c5232` |
| 3 | Analytics from real-time activity | `4379d64` |
| 4 | AI Match: taste circles, then broadcast rooms with invite popups | `5dad7f3` `0830afb` |
| 5 | Synced watch and listen parties | `b37c345` |
| 6 | Voice talk rooms (WebRTC) | `56f50b1` |
| 7 | Trailer in the hero panel | `bfa57d8` |
| 8 | Group AI mode | `45e7ded` |
| 9 | Catch me up (RAG recaps) | `a7c4b54` |
| 10 | Taste DNA history and Wrapped | `1fbea9f` |

### Phase 8: Performance, UX and the assistant (25 Oct)

| What | Commit |
|---|---|
| Party overlay and player fixes | `46c31df` `066a69b` `ee76ee8` |
| Turbopack dev-cache fix (see [§12](#12-bugs-that-taught-something)) | `8563c41` |
| **Shared server cache** with write-driven invalidation (see [§6](#6-the-server-cache)) | `3628809` |
| Auto-sliding carousels on a shared beat; avatars link to profiles everywhere | `49cd149` `b105afe` |
| **The in-app assistant:** RAG over 28 help articles, the catalog and the user's own snapshot | `6c339ed` |

### Phase 9: Automated tests and CI (25–26 Oct)

Vitest unit tests across the services, written one service at a time (`ce7116a` → `94f6bf3`). A GitHub Actions CI pipeline runs typecheck, lint, tests and a build (`ec6605c` `6e6759a`). Playwright E2E tests were added (`6fe8984` `7576293`).

### Phase 10: Rename, polish and the quality pass (26 Oct)

| What | Commits |
|---|---|
| **AniVerse → EntertainVerse** everywhere a user sees it. Browser-storage keys were kept, so nobody loses saved state. | `8d50753` |
| Landing rewrite, sidebar reorganised by importance, glass cards, denser fitted carousels, content page polish | `debdd49` `96de545` `433b388` `8665f8c` |
| **Realtime fixes:** sockets rejected in production, DMs never arriving live, incoming DMs shown as your own | `1973883` `c764df0` `070961f` |
| **Realtime features:** TURN relay support, typing indicators and online status, live hosting (share screen or camera) | `261d320` `8ce7873` `6c710df` |
| Client bundles pulled in Prisma and crashed pages; fixed, plus an architecture test so it can't come back | `ec5734f` |
| **Responsive and accessibility audit:** every route at 5 widths and with axe, down to 0 overflow and 0 violations | `3756f5b` `46bbaa6` `6c1f131` `d01e73c` `d5bc7c8` |
| **Bug backlog** | `55639d5` `eacf17e` `19aefa2` `df310b4` `7b8c563` `ba3b044` `866af0f` |

The bug backlog fixed:
- sign-out that could be undone
- collaborators with no access
- fake watchlist scores
- community admin rules
- duplicate reviews
- the password showing in the URL
- small hardening items

### Phase 11: Multi-server readiness (26–27 Oct)

Each piece fixes one thing that breaks when the app runs on two servers behind a load balancer. [§9](#9-from-one-server-to-many) explains each one in depth.

| Piece | Commit |
|---|---|
| Socket.IO Redis adapter: emits reach users on any server | `96a7301` |
| Party and talk-room state in a Redis store with locks | `b4e7a79` |
| Cache invalidation over pub/sub, presence across servers, rate limits in Redis | `244dbc2` |
| Uploads in S3 | `f4e3e9f` |
| `/api/health` and graceful shutdown | `e7522e1` |

### Phase 12: Containers and the two-server test stack (27 Oct)

| What | Commit |
|---|---|
| Docker image that builds without a database; nginx + 2 apps + Postgres + Redis + S3 test stack | `c7af5d7` |
| Host keeps the host role on reconnect, found by the failover test | `d6362e9` |
| Pre-compressed hero images; image optimizer off | `7b89137` |
| Stabilised the stack run | `ae87d5f` |

### Phase 13: Production on AWS (27 Oct)

| What | Commit |
|---|---|
| GitHub Actions builds the image and pushes it to GHCR on every push to `main` | `36606b0` |
| Compose files and the env template for the two servers | `7f1a830` |
| `up` / `down` scripts | `8af267a` |

The AWS console setup is not in git, so it is written down in [§11](#11-containers-and-production-on-aws):
- security groups
- the IAM role and CLI user
- the target group and bucket
- installing Docker on the servers

The site went live on 27 Oct.

**Deliberately skipped:** nightly `pg_dump` backups to S3, and a k6 load test (one server against two). Both were planned and cut to finish the project.

---

## 4. Architecture

### 4.1 The big picture (production)

```
                    Browser (HTTPS)
                         │
            Cloudflare quick tunnel  (random https://*.trycloudflare.com per demo)
                         │   cloudflared runs as a container on server A
                         ▼
         Application Load Balancer  (HTTP :80, sticky cookie, health checks)
                ┌────────┴─────────┐
                ▼                  ▼
     Server A (t3.small, 2b)   Server B (t3.small, 2a)
     ┌─────────────────────┐   ┌─────────────────────┐
     │ app :3000           │   │ app :3000           │
     │ Next.js + Socket.IO │   │ Next.js + Socket.IO │
     │ Postgres :5432 ◄────┼───┤ (private network)   │
     │ Redis    :6379 ◄────┼───┤                     │
     └─────────┬───────────┘   └─────────┬───────────┘
               └──────────┬──────────────┘
                          ▼
                 S3 bucket (uploads), via the servers' IAM role
```

The same Docker image runs on both servers. Everything that differs between them comes from environment variables: `SERVER_NAME`, the database and Redis addresses, and secrets.

### 4.2 Inside one app server

```
Browser
  ├── RSC pages ─────► app/**/page.tsx ─► lib/data/** ─► lib/services/** ─► Prisma ─► Postgres
  ├── REST ──────────► app/api/**/route.ts ─► lib/services/**   (Zod validation, auth guard)
  │                         └─ AI routes ─► lib/ai/** · lib/recommender/** · lib/assistant/**
  ├── NDJSON streams ◄─ long AI tasks (imports, reviews, roadmaps, recaps, assistant)
  └── Socket.IO ─────► server.ts ─► lib/socket/server.ts   (auth, chat, DMs)
                                     lib/socket/parties.ts  (parties, talk rooms, live hosting)
                                     lib/socket/presence.ts (online, typing)
                                         │
                                         └─ Redis: adapter (pub/sub) · shared store · cache sync · rate limits
```

| Layer | Job |
|---|---|
| `app/**/page.tsx` | Routes and layouts. Server components load data directly. |
| `app/api/**/route.ts` | REST handlers: parse with Zod, check auth, call a service, map errors to status codes. |
| `components/**` | UI by domain. Client components never import server modules (a test enforces it). |
| `lib/services/**` | Business logic: 40 services. The only layer that talks to Prisma. |
| `lib/data/**` | Thin, page-shaped accessors over services. |
| `lib/mappers/**` · `lib/validators/**` | Database rows → view models; Zod request schemas. |
| `lib/ai/**` · `lib/recommender/**` · `lib/assistant/**` | The LLM provider layer, recommender maths, and RAG. |
| `lib/socket/**` · `lib/cache/**` · `lib/redis.ts` | Realtime, caching, and shared state. |
| `prisma/schema.prisma` | The source of truth for the data model. |

### 4.3 Why a custom server (`server.ts`)

Socket.IO needs a long-running Node process that owns the HTTP server, and plain `next start` doesn't give you that. So `server.ts`:

1. Creates a Node HTTP server.
2. Hands normal requests to Next's request handler.
3. Attaches Socket.IO on the path `/api/socket/io`.
4. Starts listening for cache invalidations from other servers.
5. Warms the cache.
6. Installs the SIGTERM/SIGINT handlers for graceful shutdown.

The catch is that serverless hosting (Vercel-style) can't run it. It needs a real server or container, which is what led to EC2.

### 4.4 The `globalThis` pattern (this comes up in interviews)

`server.ts` runs under `tsx`, while API routes are **bundled by Next**. The same file, for example `lib/socket/io-instance.ts`, is therefore loaded **twice**: once in each module graph. A module-level variable set by `server.ts` is invisible to the routes.

This caused a real bug: DMs saved fine but never arrived live (`c764df0`). The fix keeps the shared singletons on `globalThis`, so both copies see one object:
- the Socket.IO server
- the Redis client
- the server cache store
- the draining flag
- the online-user counts

### 4.5 Request lifecycle of a page view

1. The browser requests `/dashboard`. The ALB picks a server; the sticky cookie keeps the same one afterwards.
2. `middleware.ts` (Edge runtime) reads the JWT cookie. No session means a redirect to `/login?callbackUrl=…`.
3. The server component calls `lib/data` → services → `cached(...)` → Prisma on a miss.
4. RSC payload and HTML stream back. Client components hydrate and open one Socket.IO connection, authenticated by the same cookie.

---

## 5. Data, auth and security

### 5.1 Data model (57 models)

| Domain | Models |
|---|---|
| Identity | `User`, `Account`, `TasteProfile`, `UserPreferences` |
| Catalog | `Content` (+ seasons, episodes, characters, featured tracks, related), `MusicTrack`, `Artist`, `ArtistMember`, `Genre`, `ContentGenre`, `CatalogReview` |
| Library | `WatchlistItem`, `Collection` (+ items, favourites, follows, collaborators), content/artist/track favourites, `ArtistFollow` |
| Social | `UserFollow`, `FriendRequest`, `Community` (+ members, posts, likes, chat, voice/watch channels), `Review`, `ReviewLike` |
| Messaging | `DirectConversation`, `DirectMessage`, `DirectConversationRead` |
| Activity | `Notification`, `Rating`, `WatchEvent`, `ListenEvent` |
| AI | `CatalogEmbedding`, `AiTasteProfile`, `AiRoadmap`, `AiRoadmapStep`, `AiCollectionSuggestion`, `AiRecap` |
| AI Match | `MatchProfile`, `MatchCircle`, `MatchCircleMember` |
| Wellbeing | `ScreenTimeSettings`, `ScreenTimeDay` |

**Design points worth knowing:**

- **One DM conversation per pair.** `DirectConversation` stores `participantLowId` / `participantHighId`: the two ids are sorted, so the pair has a single canonical row and a unique index stops duplicates.
- **One review per user per title.** This is enforced by **unique indexes**, not just app code (`7b8c563`). Two simultaneous submits both passed the app-level "already reviewed?" check. A database constraint is the only check that can't race. The migration first removed existing duplicates, keeping the most-liked and then the earliest. Postgres treats NULLs as distinct, so each target column gets its own index.
- **Migrations are additive.** There are 35 of them, and production applies them with `prisma migrate deploy`, never `migrate reset`.

### 5.2 Authentication (NextAuth v5)

| Piece | How |
|---|---|
| Sessions | **JWT** strategy: no session table. The token carries `id`, `handle`, `role` and `onboardingCompleted`. |
| Credentials | Sign in with email *or* username. Passwords are hashed with **bcrypt**. Input is validated with Zod. |
| Google (and Discord) | Enabled only when their env keys are set. OAuth sign-in **links to an existing account by email only if the provider says the email is verified**; otherwise anyone could claim someone else's email. |
| Route protection | `middleware.ts` runs on the Edge, so it only checks "is there a session?" for `/dashboard`, `/onboarding` and `/admin`. Finer redirects (onboarding incomplete, already signed in) happen in server pages via `lib/auth-guards.ts`, which can read the database. |
| Admin | Roles: `USER`, `CONTENT_ADMIN`, `MUSIC_ADMIN`, `ARTIST_ADMIN` and `SUPER_ADMIN`. Each admin API checks its role, so a music admin can't touch content. |
| Sockets | The Socket.IO handshake reads the same session cookie and decodes it with `getToken`. An unauthenticated socket is refused. |

**Two auth bugs worth telling** (details in [§12](#12-bugs-that-taught-something)):

1. **Sign-out undone.** The middleware wrapper re-issued the session cookie on every request. A prefetch that finished *after* sign-out put the cookie back. The middleware now strips re-issued session cookies (`lib/auth-session-cookie.ts`) and only *reads* the session.
2. **`__Secure-` cookie prefix.** The socket server guessed the cookie name from `NODE_ENV`, but NextAuth uses the prefix only on HTTPS. It now reads whichever cookie the browser sent.

### 5.3 Security checklist

- **Passwords:** bcrypt hashes. Login and signup forms use `method="post"`, so a submit before hydration can't put the password in the URL (`ba3b044`).
- **Open redirects:** the `callbackUrl` must be same-site. An E2E test checks that an off-site URL is ignored.
- **Uploads:**
  - The type is checked against an allow-list (JPG, PNG, WebP, GIF for images) with a 10 MB cap.
  - Stored names are random UUIDs.
  - Served with `X-Content-Type-Options: nosniff`, so a file can't be sniffed into HTML or script.
- **Secrets:**
  - AI keys are read only on the server.
  - TURN credentials come from `/api/realtime/ice`, not the JS bundle.
  - `.env*` is excluded from the Docker image.
  - Production secrets live in a `chmod 600` `.env` on each server.
- **Rate limits:** the assistant allows 30 questions per 10 minutes per user, counted across servers, to protect the shared AI quota.
- **Realtime authorisation:**
  - Joining a chat room, party or talk room checks community membership on the server.
  - Typing events only go to rooms the sender has already joined.
  - Online status is visible only to people who could DM you.
- **AI grounding:** the LLM only picks from catalog IDs it is given (schema-enforced enums), so it can't invent titles. The assistant must cite sources and never reveal the user snapshot unprompted.
- **Production network:**
  - Postgres and Redis are bound to server A's private IP only, password-protected, and reachable only from the app security group.
  - SSH is limited to known home IPs.
  - The S3 bucket is private, with block-public-access on.
  - Servers reach S3 through an IAM role, so there are no AWS keys on disk.

---

## 6. The server cache

`lib/cache/server-cache.ts` is an **in-memory cache inside each app server**, shared by every request that server handles. In-memory is the fastest option, and it can hold values Redis or Next's caches can't easily serialise, like `Float32Array` embedding vectors and Maps of taste signals.

| Feature | What it means | Why |
|---|---|---|
| **TTL + stale-while-revalidate** | Fresh until `ttl`. Then, for `swr` more seconds, the stale value is served at once while one background refresh runs. | Nobody waits on a refresh. |
| **Single-flight** | Concurrent misses for the same key share one load promise. | Stops a "thundering herd" of identical queries after an expiry. |
| **Tags** | Every entry has tags (`catalog`, `communities`, `collections`, `embeddings`, `user:<id>`). Invalidating a tag drops all its entries. | Precise invalidation without knowing every key. |
| **Version check** | Each tag has a version number. A load that started *before* an invalidation isn't saved. | Avoids caching data that was read before a write committed. |
| **LRU bound** | At most 2,000 entries. A `Map` keeps insertion order, and re-inserting on read makes it least-recently-used. | Memory can't grow forever. |

**Write-driven invalidation** (`lib/cache/invalidation.ts`) is a **Prisma client extension**. Every database write clears the tags it affects automatically, so no service can forget to:

- **By model:** `Content`, `MusicTrack`, `Artist` and the like clear `catalog`; `Community*` clears `communities`.
- **By user:** the user id is found in the written row's `userId`, `authorId`, `followerId` and similar fields, and clears `user:<id>`.
- **Counter-only updates are skipped.** View counts and like counts would otherwise wipe the shared catalog on every page view.
- **Delayed double delete.** Writes inside a transaction aren't committed yet when the hook runs, so tags are cleared again 500 ms later.

**Across servers** (`lib/cache/cross-server.ts`), each server publishes `{from, tags}` on the Redis channel `ev:cache:invalidate`. The others subscribe and clear locally, skipping their own messages.

**Warm-up:** after `listen`, `server.ts` calls `/api/internal/warm`, guarded by a random per-boot token. This fills the catalog, embeddings and collaborative graph before the first visitor arrives.

The measured results are in [§2](#2-numbers). The recommender evaluation gave identical results with the cache on and off: the cache changes speed, not answers.

---

## 7. Realtime: chat, DMs, presence, parties, voice

Socket.IO runs at `/api/socket/io`. Every socket is authenticated from the session cookie and joins a personal room, `user:<id>`.

### 7.1 Rooms and events

| Feature | Room | Events |
|---|---|---|
| Community chat | `chat:<slug>:<channel>` | `chat:join`, `chat:leave`, `chat:send` → `chat:message`, `chat:typing` |
| DMs | `dm:<conversationId>`, plus each participant's `user:<id>` | `dm:join`, `dm:leave`, `dm:typing`. Sends, edits and deletes go through REST and are broadcast to both users' rooms. |
| Presence | `presence:<userId>` | `presence:watch` → `presence:state` / `presence:update` |
| Watch / listen party | `party:watch:<channelId>` / `party:listen:<slug>` | `party:join`, `party:leave`, `party:control`, `party:chat`, `party:reaction` → `party:state` |
| Live hosting | inside a watch party | `live:start`, `live:stop`, `live:request`, `live:signal` |
| Talk room (voice) | `voice:<channelId>` | `voice:join`, `voice:signal`, `voice:state`, `voice:leave` |

**Why DMs go to `user:<id>` rooms too:** before `070961f`, the messages panel only listened to the open conversation, so the inbox, unread counts and previews never updated live. Every socket now joins its user's room, and DM events go to both participants.

A second bug in the same area: the broadcast included the *sender's* `isOwn: true`, so the recipient saw the incoming message as their own. `isOwn` is no longer broadcast; each client works it out.

### 7.2 Presence (online status)

- Each server counts its own sockets per user, so several tabs don't make the status flicker.
- When a user's last local socket closes, the server **asks every server** (`io.in(room).fetchSockets()` goes through the Redis adapter) whether the user still has a tab open anywhere. Only if not does it announce "offline".
- A disconnect caused by *this server shutting down* (reason `"server shutting down"`) is ignored, because the user is reconnecting elsewhere.

### 7.3 Synced watch and listen parties

The server stores the playback state, not a stream:

```
{ playing, positionSec, updatedAt, media, queue, index, hostId, members, ... }
```

Each client computes where playback should be right now:

```
expected = playing ? positionSec + (now + skew − updatedAt) / 1000 : positionSec
```

- **Clock skew:** every `party:state` carries `serverNow`. The client works out `skew = serverNow − Date.now()`, so a laptop with a wrong clock still syncs.
- **Drift correction:** every 2 s each client compares its player with `expected` and seeks if it is off by more than **1.5 s**. Small drift is left alone, to avoid stutter.
- **Host control:** play, pause, seek and load are host-only. Anyone can add songs to a listen party's queue. If the host leaves, the next member becomes host.
- **Media is legal-only:** a licensed `videoUrl` if an admin set one, otherwise the official YouTube trailer. There is also a "clock" mode: everyone watches on their own service and the party keeps the timer and chat in sync. Listen parties use licensed audio or the 30-second preview.

### 7.4 Talk rooms and live hosting (WebRTC)

- **Talk rooms are a mesh.** Every peer connects to every other peer, with up to **8** per room. Socket.IO only relays the WebRTC offers, answers and ICE candidates (signalling). The audio goes browser to browser.
- **STUN and TURN.** STUN lets a browser discover its public address, which is enough for most home networks. Phones on mobile data and office networks often need a **TURN relay**. `/api/realtime/ice` serves STUN plus an optional TURN server from `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL`.
- **Live hosting.** A watch-party host can share their screen (with tab audio) or camera. It's one peer connection per viewer, up to 8, because the host uploads one stream per viewer.
- **At scale** you'd use an **SFU** (for example LiveKit), where each person uploads once to a server that forwards streams.

### 7.5 Party state across servers

Party state used to live in per-process Maps. With two servers, two people in the same party saw different hosts and members. It now lives in a **shared store**, `lib/socket/shared-store.ts`: Redis when `REDIS_URL` is set, memory otherwise.

- **`update(key, change)` is a locked read-modify-write:**
  - Take the lock: `SET key:lock <uuid> NX PX 5000`.
  - Read the value, apply the change, write it back with a 24 h TTL.
  - Release the lock with a **Lua script** that deletes it only if it still holds *our* uuid. The lock may have expired and been taken by someone else.
  - Retry up to 200 times with a 10–30 ms random backoff.
- **Ghost sockets.** If a server crashes, its sockets' "leave" never runs. On join, the server asks every server which sockets are really in the room, and drops stored ones that aren't.
- **Ordering bug** (found by the failover test, `d6362e9`): on rejoin, the ghost was removed *before* the new socket was added. For a moment the host had no sockets in the party, so the host role passed to someone else. The new socket is now registered first.

---

## 8. AI: recommender, AI mode, RAG

### 8.1 The provider layer

`lib/ai/provider.ts` hides the vendor behind one small API:

- `generateStructured`: JSON shaped by a Zod schema.
- `streamText`: streamed text.
- `researchWithWeb`: Google-Search-grounded research.

`AI_PROVIDER=gemini` (the default, free tier) or `claude`.

**Two tiers** fit the free quota:

| Tier | Model | Used for |
|---|---|---|
| "smart" | Gemini Flash, about 20 requests/day free | Heavy admin work and roadmaps. Falls back to the fast tier when the quota runs out. |
| "fast" | Flash-Lite | The high-volume user calls: chat, recaps, group verdicts, Wrapped personas, the assistant. |

Without any AI key, everything falls back to the non-AI taste engine.

### 8.2 The hybrid recommender

```
score = 0.50 × taste-engine score            (genres, types, languages, onboarding answers)
      + 0.35 × semantic similarity           (cosine to the user's taste centroid in embedding space)
      + 0.15 × collaborative co-occurrence   ("fans of X also love Y", item-item)
```

If an item has no embedding: `0.85 × taste + 0.15 × collaborative`.

- **Embeddings:**
  - Every catalog item becomes a spoiler-free text: type, genres, tags, credits and synopsis.
  - `gemini-embedding-001` encodes it as a 768-dimension vector, stored in `CatalogEmbedding`.
  - An item is re-embedded only when its text changes; this runs after admin saves.
  - The catalog is a few hundred items, so similarity is an **in-memory dot product**. There's no vector database: a deliberate choice at this size.
- **The taste centroid** is the weighted average of the vectors of things you loved, watched, saved or followed.
- **History decays** with a **30-day half-life**: `weight = minutes × 0.5^(ageDays / 30)`.
- **Min-max scaling:** cosines cluster in a narrow band, so semantic scores are rescaled to 0–1 across the candidates before blending.
- **"Why this?":** the closest *anchor* (the item that pulled a candidate up) plus shared traits. For example: "Because you loved Squid Game · Thriller & Drama".
- **Evaluation** (`npm run eval:recommender`, leave-one-out):
  - Each favourite is hidden in turn, the whole catalog is ranked, and the test checks where the hidden item lands.
  - **HitRate@K** is the share found in the top K.
  - **MRR@20** is the mean of 1/rank, counting 0 outside the top 20.

| Titles | HitRate@10 | MRR@20 |
|---|---:|---:|
| Popularity baseline | 59.3% | 0.203 |
| Taste engine only | 44.4% | 0.189 |
| + embeddings | 55.6% | 0.285 |
| **Full hybrid** | **66.7%** | **0.350** |

Caveat: there are only 27 hidden favourites across 3 seeded users, so treat these numbers as indicative. Full table: [docs/recommender-evaluation.md](docs/recommender-evaluation.md).

### 8.3 AI mode, roadmaps and group picks

- **AI mode:** an animated quiz (vibe, themes, pace, commitment, hours per week, things to avoid, personality…) **or** a chat. In chat, the model turns free text into the same structured answers, asking one follow-up at a time. The answers become an anchor in the recommender.
- **Roadmaps:**
  - The recommender retrieves ranked candidates, and the LLM orders 6–9 of them into phases with a written taste analysis.
  - **Runtimes come from catalog data, not the model**, and are scheduled into weeks of your hours.
  - Steps tick off from real watch events. Stalled steps get a swap.
  - An adjust-chat ("make it shorter") rebuilds the rest and keeps finished steps.
- **Group picks:**
  - Every member's ranking scores a shared pool.
  - Titles most of the group has already seen are dropped.
  - The score is `0.6 × mean + 0.4 × minimum`, so a pick must work for the least-happy person too.

### 8.4 RAG in three places

RAG = **retrieve real data first, then generate from it**.

| Feature | Retrieve | Generate |
|---|---|---|
| **Catch me up** | Episode descriptions up to your stopping point, or else web research limited to it | A recap under the strict rule "never past the stopping point", with sources shown. Cached per title, stopping point and depth, and shared between users. |
| **Admin import / review** | Metadata API facts (TMDB, AniList, iTunes, Deezer, MusicBrainz) + grounded web research | Editorial drafts. Facts are never generated. A second pass reviews every field. |
| **Assistant** | Three sources (below) | A streamed answer with inline citations `[1]` and only real links |

The assistant's three sources:
1. The 28 help articles, by **semantic + keyword** match. The keyword match keeps it working when embeddings are down.
2. The catalog, by meaning or by name.
3. The asking user's private snapshot: stats, roadmap and limits. It is never another user's data.

### 8.5 Free-tier engineering

- Embeddings are paced to 100 per minute and resume where they left off.
- `api.tmdb.org` is used because `api.themoviedb.org` is blocked by some Indian ISPs.
- If the search-grounding quota runs out, recaps fall back to the synopsis, say so, and aren't cached. A grounded recap is written once the quota returns.

---

## 9. From one server to many

**Goal:** run two copies of the app behind a load balancer, so that one can stop without users losing anything.

**Rule followed throughout:** without `REDIS_URL` / `S3_BUCKET` the app behaves exactly as before, with memory and local disk. Local development needs no Redis or S3.

| # | What breaks with two servers | Fix | Where |
|---|---|---|---|
| 1 | `io.to(room).emit()` only reaches sockets on *this* server. A DM to a user on server B is saved but never delivered live. | **Socket.IO Redis adapter.** Every emit is published to Redis, and each server delivers to its own matching sockets. App code is unchanged. If Redis is unreachable at boot, **startup fails**: better than silently losing messages behind a load balancer. | `lib/socket/redis-adapter.ts` |
| 2 | Party and talk-room state in per-process Maps: two views of one party. | **Shared store** in Redis with locked updates and a TTL (see [§7.5](#75-party-state-across-servers)). | `lib/socket/shared-store.ts` |
| 3 | A write on A clears A's cache, but B keeps serving stale data. | **Pub/sub invalidation** on `ev:cache:invalidate`. | `lib/cache/cross-server.ts` |
| 4 | Online status counted per server: someone on B looks offline to A. | **Ask all servers** with `fetchSockets()` through the adapter before announcing "offline". | `lib/socket/presence.ts` |
| 5 | Rate limits counted per server: the real limit is N × the configured one. | A **Redis sorted-set sliding window**, done in one `MULTI` (below). | `lib/rate-limit.ts` |
| 6 | An upload saved to A's disk is a 404 on B. | **S3** when `S3_BUCKET` is set. The app serves `/uploads/...` itself, so stored URLs look the same with disk or S3. Credentials come from the IAM role. | `lib/file-storage.ts`, `app/uploads/[...path]/route.ts` |
| 7 | The load balancer can't tell a broken server from a healthy one. | **`/api/health`** (below). | `app/api/health/route.ts` |
| 8 | Deploying or stopping a server drops in-flight requests and sockets. | **Graceful shutdown** (below). | `lib/server-lifecycle.ts`, `server.ts` |

**The rate-limit window (#5), step by step.** For every hit:
1. `ZREMRANGEBYSCORE` removes hits older than the window.
2. `ZADD` adds this hit with the time as its score.
3. `ZCARD` counts the hits.
4. `PEXPIRE` sets the key's expiry.

If the count is over the limit, the request is refused and its own entry is removed, so refused requests don't use up slots.

**The health check (#7):**
- It checks the database (`SELECT 1`) and Redis (`PING`), each with a 2 s timeout, because a hanging check counts as down.
- It returns `200 {status:"ok", server, checks}` or `503`.
- `Cache-Control: no-store`.

**Graceful shutdown (#8)** happens on SIGTERM:
1. Set the *draining* flag, so `/api/health` returns 503 and the load balancer stops sending new visitors.
2. Keep serving for `SHUTDOWN_DRAIN_MS` (10 s in production).
3. `io.close()` closes the sockets, and their browsers reconnect *through the balancer to the other server*. It also closes the HTTP server, after in-flight requests finish.
4. Exit. A hard exit fires after drain + 10 s, so a stuck connection can't hang it.

**Sticky sessions:** the ALB pins a visitor to one server with a cookie, so a page and its socket usually land on the same server. Nothing *depends* on stickiness, since all shared state is in Redis or Postgres. It just reduces cross-server traffic, and helps Socket.IO's HTTP long-polling fallback, which needs consecutive requests on the same server.

---

## 10. Testing and CI

### 10.1 Unit tests (Vitest): 449 tests, 33 files

- **Services:** collections, collaborators, communities, DMs, favourites, follows, likes, reviews, screen time, uploads, watchlist. They run against a **Prisma mock** (`tests/helpers/prisma-mock.ts`), so they need no database.
- **Libraries:** the recommender's hybrid maths, the cache (single-flight, SWR, tags, cross-server sync), invalidation rules, the shared store (lock and update semantics), file storage, ICE servers, validators, formatting, search, carousel paging, and auth redirects and cookies.
- **Routes:** the assistant chat route and the health route (200, 503 and draining).
- **Hooks:** carousel autoplay and column count, with jsdom and Testing Library.
- **Architecture test** (`tests/unit/architecture/client-imports.test.ts`): it fails if any `"use client"` file imports a module that depends on Prisma, services, the cache or the recommender. This guards against the bug in `ec5734f`.

### 10.2 End-to-end tests (Playwright)

They run against a **production build** with the real custom server: the same thing that's deployed.

| Project | What |
|---|---|
| `setup` | Signs the demo user in once; other tests reuse the saved session. |
| `desktop` | Auth: guest redirect and return, username or email login, wrong password, **open-redirect guard**, signup and duplicate email, skip login when signed in, sign-out, **sign-out during a dashboard load stays signed out**. |
| `mobile` (Pixel 7) | Every page fits at phone widths (no horizontal overflow); bottom nav; drawer. |
| `multi-server` (stack only) | The load balancer uses both servers; **a DM sent via A arrives live for a user on B**; **a listen party with the host on A and a member on B stays in sync**; **a file uploaded via A is served by B**; **a change via A shows on B at once** (cache clearing). |
| `failover` (stack only) | **Stopping a server hands its users to the other one without losing the party**: host, position and members survive. It runs last because it stops a server. |

### 10.3 The two-server stack (`npm run test:e2e:stack`)

`docker-compose.e2e.yml` reproduces production on one machine:

```
browser ──► nginx lb :8080 ──► app-a :3201 ─┐
                          └──► app-b :3202 ─┼──► postgres (tmpfs) · redis · s3mock
```

`scripts/e2e-stack.ts`:
1. Builds the image.
2. Runs `compose down`.
3. Starts the data services.
4. Runs `prisma migrate deploy` and the seed.
5. Starts the apps and the load balancer.
6. Runs Playwright.
7. Removes everything again, unless `--keep`.

Postgres keeps its data in **tmpfs**, so every run starts from an empty database. It is never "reset". nginx stands in for the ALB:
- the `lb_server=a|b` cookie gives stickiness
- a `backup` server provides failover
- `proxy_connect_timeout 2s` makes it give up quickly on a stopped container
- WebSocket upgrade is passed through
- buffering is off for streamed answers

Results: all tests pass, including failover. Stack mode runs with 2 workers and 1 retry, because six containers and the browsers share one laptop. One mobile navigation check is occasionally flaky under that load.

### 10.4 CI (GitHub Actions)

| Workflow | On | Does |
|---|---|---|
| `ci.yml` → `build` | Push to `main`, PRs | Postgres service → `npm ci` → `prisma generate` → `migrate deploy` → **typecheck** → **lint** → **unit tests** → **build** |
| `ci.yml` → `e2e` | Same | Postgres service → Playwright Chromium → `npm run test:e2e` (reset + seed, build, run). Uploads the report as an artifact. |
| `docker.yml` | Push to `main`, manual | Buildx → builds the image → pushes `ghcr.io/<owner>/entertainverse:latest` **and** `:<commit-sha>` (a fixed version to roll back to). Layers are cached in GitHub Actions' cache. |

---

## 11. Containers and production on AWS

### 11.1 The Docker image

```
base       node:22-bookworm-slim + openssl (Prisma's engine needs it)
deps       npm ci                      (all dependencies, to build with)
prod-deps  npm ci --omit=dev           (+ delete the musl/Alpine native binaries: this is glibc)
build      next build                  (no database needed)
runtime    source + prod node_modules + .next, USER node, HEALTHCHECK, CMD node --import tsx server.ts
```

| Choice | Why |
|---|---|
| Multi-stage build | The runtime image has no compilers or dev dependencies, so it's smaller with less to attack. |
| `node:22` | The AWS SDK dropped Node 20. |
| Non-root `node` user | A compromised process can't own the container. |
| `CMD ["node", …]`, not `npm start` | Node is **PID 1**, so `docker stop`'s SIGTERM reaches the graceful shutdown. npm doesn't forward signals reliably. |
| `HEALTHCHECK` on `/api/health` | Docker and compose know when the app is really ready. |
| `.dockerignore` excludes `.env*`, tests, `.git` | No secrets baked in. Configuration arrives at run time. |
| Build needs no database | Unused `generateStaticParams` were removed. Those pages are dynamic anyway, since they read the session. |
| `images.unoptimized` + pre-compressed WebP | The on-request image optimizer hung after a cold start, and small servers shouldn't spend CPU resizing images. |

### 11.2 AWS resources

| Resource | Setup |
|---|---|
| **Region** | ap-southeast-2 (Sydney) |
| **Server A** `entertainVerse-server1-prod` | t3.small, Ubuntu, 25 GiB, zone 2b. Runs app + Postgres 16 + Redis 7 + cloudflared. |
| **Server B** `entertainVerse-server2-prod` | t3.small, zone 2a. Runs the app only. Two zones mean one zone failure doesn't take out both apps. |
| **Security groups** | `alb-sg`: 80/443 from anywhere. `app-sg`: 3000 **only from `alb-sg`**, and 22 from home IPs. `data-sg` (server A): 5432/6379 **only from `app-sg`**. |
| **Target group** `entertainverse-tg` | Health check `/api/health` every 10 s, 5 s timeout, 2 healthy / 2 unhealthy, expects 200. Sticky `lb_cookie` for 1 day. Deregistration delay 30 s. Targets are registered on port 3000. |
| **ALB** `entertainverse-alb` | Internet-facing, in zones 2a and 2b, using `alb-sg`. Listener HTTP:80 forwards to the target group. **Created by `up` and deleted by `down`**, because an ALB can't be paused. |
| **S3 bucket** | Private, block-public-access on. Uploads go under `uploads/`. |
| **IAM role** `entertainverse-ec2-role` | Attached to both servers. Its inline policy allows access to *this bucket only*. The SDK picks it up automatically, so there are no keys on the servers. |
| **IAM user** `entertainverse-cli` | Used from the laptop by the scripts. It can only describe resources, start and stop **these two instances**, create, delete and register ELB resources, and `ec2:GetSecurityGroupsForVpc` (which ALB creation needs). It has no S3 access. |
| **GHCR** | The image is public: `ghcr.io/reetam-dutta-24/entertainverse`. |

Other server setup:
- Docker is installed with log rotation capped.
- Each server has **2 GB of swap**: a t3.small has 2 GB of RAM.
- Postgres and Redis publish ports **on the private IP only** (`${PRIVATE_IP}:5432:5432`), never the public one.

### 11.3 Configuration

| File | Role |
|---|---|
| `deploy/server-a.compose.yml` → `~/entertainverse/compose.yml` on A | Postgres (volume `pgdata`), Redis (`--requirepass`), app (`SERVER_NAME=a`, database and Redis by service name). Health-gated `depends_on`, `stop_grace_period: 30s`. |
| `deploy/server-b.compose.yml` → `~/entertainverse/compose.yml` on B | The app only (`SERVER_NAME=b`, database and Redis at A's private IP). |
| `deploy/env.example` → `~/entertainverse/.env` (`chmod 600`) | `AUTH_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD` (hex only, because they go inside URLs), `PRIVATE_IP`/`SERVER_A_IP`, `APP_URL`, `S3_BUCKET`, `S3_REGION`, and the AI keys. |

The `.env` file does two jobs:
- compose uses it to fill `${…}` in the compose file
- `env_file:` passes it into the container

`AUTH_URL`, `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` are all set from `APP_URL`.

### 11.4 HTTPS without a domain

There's no domain, so no ACM certificate. Instead, a **Cloudflare quick tunnel**:

- `cloudflared` runs as a container on server A with `--url http://<ALB DNS>`.
- It dials *out* to Cloudflare, so no inbound port is needed.
- Cloudflare gives a random `https://<words>.trycloudflare.com` and forwards to the ALB.
- **The address changes every time the tunnel starts.** The up script therefore reads the new URL and writes it into `APP_URL`, which NextAuth needs for callbacks and secure cookies.
- **Set `AUTH_URL` explicitly:** the ALB rewrites `X-Forwarded-Proto` to `http`, so NextAuth's `trustHost` alone would treat the site as plain HTTP.
- **Google sign-in is left off in production:** its redirect URI must be registered in advance, and the URL changes per demo.
- The tunnel container runs with `--restart no`, because a restarted tunnel would have a *different* address than the apps were told.

### 11.5 `deploy/up.ps1` and `deploy/down.ps1`

`up.ps1`:
1. Start both instances and wait until they're running.
2. Create the ALB, if missing, and its HTTP:80 listener (rerunning is a no-op). Register both instances on port 3000.
3. On A over SSH: start cloudflared and wait until its logs show the `trycloudflare.com` URL.
4. On both servers: `sed` the URL into `APP_URL` in `.env`, then `docker compose up -d`, which recreates the app container because its environment changed.
5. `aws elbv2 wait target-in-service` for both targets.
6. `GET <tunnel>/api/health`, then print the site URL, the ALB DNS name and the SSH IPs.

`down.ps1`: delete the ALB (its listener goes with it) → stop both instances. Stopping sends SIGTERM, so the apps drain cleanly. **Between demos, only the EBS disks and the S3 bucket cost money.**

**SSH retries.** `common.ps1` retries SSH only on exit code 255, which means SSH failed to connect: the server is still booting, or the home connection switched to its other public IP. Any other failure stops the script.

**Verified live on 27 Oct:**
- requests through the ALB split 3/3 between servers a and b
- HTTPS sign-in set `__Secure-authjs.session-token`, and `/dashboard` returned 200
- Socket.IO connected over a real WebSocket through Cloudflare → ALB → app
- B reached Postgres and Redis on A over the private network

### 11.6 Shipping a new version (runbook)

1. Push to `main`. GitHub Actions builds and pushes `:latest` and `:<sha>`.
2. On A, if the schema changed: `docker compose pull && docker compose run --rm app npx prisma migrate deploy`.
3. On each server, one at a time: `docker compose pull && docker compose up -d`. The other server carries traffic while one restarts. Health checks and draining make the switch.
4. **Rollback:** set the image to `:<previous-sha>` in `compose.yml`, then `docker compose up -d`.

First-time database setup (already done):
1. `docker compose up -d postgres redis`
2. `docker compose run --rm app npx prisma migrate deploy`
3. `docker compose run --rm app npx tsx prisma/seed.ts`
4. `docker compose up -d app`

---

## 12. Bugs that taught something

Each one follows the shape **symptom → cause → fix → lesson**, which is a good format for "tell me about a hard bug".

| # | Symptom | Cause | Fix | Lesson |
|---|---|---|---|---|
| 1 | DMs saved but only appeared after a refresh; chat edits never went out. | `server.ts` and Next's bundled routes load **separate copies** of `io-instance.ts`. The routes' copy was always `null`, so broadcasts were silently dropped. | Keep the Socket.IO server on `globalThis`. | Module state isn't a singleton when two module graphs exist. Silent no-ops hide bugs: log or fail loudly. |
| 2 | Every live feature dead in a production build. | The socket auth read the `__Secure-` session cookie whenever `NODE_ENV=production`, but NextAuth adds the prefix **only on HTTPS**. Production over HTTP had the unprefixed cookie. | Read whichever cookie the browser sent. | Don't infer one thing (transport) from another (environment). |
| 3 | Users signed straight back in after signing out. | The middleware's `auth()` wrapper **re-issued the session cookie** on every request. A dashboard prefetch finishing after sign-out put it back. | The middleware only reads the session and strips re-issued session cookies. An E2E test passed 15/15 repeated runs. | Race conditions between parallel requests are real; reproduce them with a test. |
| 4 | Content, watch, artist and settings pages crashed in the browser. | Client components imported small helpers from server modules, which **pulled Prisma into the browser bundle**. Prisma's extension setup throws in the browser. | Move the helpers into client-safe files, plus an **architecture test** that fails on any such import. | Fix the class of bug, not just the instance. |
| 5 | Deep routes (`/api/auth/*`, `/dashboard/ai-mode/match`) returned 404 in dev. | Turbopack's on-disk dev cache had grown to **28 GB inside OneDrive** and stored a truncated `app/` tree. | Disable the on-disk dev cache. | Synced folders and build caches don't mix. |
| 6 | Duplicate reviews from a double-click. | Two requests both passed the app-level "already reviewed?" check. | **Unique indexes**, plus a migration that removes existing duplicates first. | Only the database can enforce uniqueness under concurrency. |
| 7 | Password in browser history and server logs. | A form without `method` submitted as GET before React hydrated. | `method="post"` on the login and signup forms. | Progressive-enhancement defaults matter. |
| 8 | A reconnecting party host lost the host role during failover. | On rejoin, the old socket was removed before the new one was added, so the user briefly had zero sockets in the party. | Register the new socket first. | Order of operations in state machines; **failover tests find bugs unit tests can't**. |
| 9 | One hero image hung forever in the container after a cold start, and every later request for it waited too. | Next's on-request image optimizer left one request hanging, and all later requests queued behind it. | Pre-compress to WebP (3.0 MB → 336 KB) and turn off on-request resizing. | Remove moving parts on small servers. |
| 10 | `docker build` needed a database. | `generateStaticParams` queried Postgres for pages that were dynamic anyway. | Remove the unused static-params chain. | Builds should be hermetic; configuration belongs at run time. |
| 11 | The failover test waited 60 s. | A stopped container's IP goes **silent** instead of refusing connections, so nginx waited its default connect timeout. | `proxy_connect_timeout 2s`. | "Down" often means "doesn't answer", not "refuses". |
| 12 | Incoming DMs rendered as if you had sent them. | The broadcast carried the sender's `isOwn: true`. | Don't broadcast viewer-specific fields; each client works them out. | Payloads sent to many users must not contain per-viewer data. |
| 13 | Watchlist showed "AI match 78%…" that was made up. | A placeholder (`78 + position % 19`) was never replaced. | Use the recommender's real score. | Fake data in a UI is a trust bug. |
| 14 | A production server couldn't reach the internet (Docker install failed). | The security group's outbound rules were copies of the inbound ones. | Outbound "All traffic". | Security groups are stateful per connection, but outbound still needs a rule. |
| 15 | `up` failed creating the ALB: AccessDenied. | Creating an ALB calls `ec2:GetSecurityGroupsForVpc`, which isn't covered by `ec2:Describe*`. | Added that one action to the least-privilege policy. | Least privilege is found by iterating on real errors. |
| 16 | SSH to the servers failed about half the time. | The home connection alternates between **two public IPs**, and only one was allowed. | Allow both; the scripts retry connect failures. | Check your own network before blaming the server. |
| 17 | The production seed printed "Seed complete" but never exited. | Seeding notifications opened a Redis connection (`REDIS_URL` is set in the container) that kept Node's event loop alive. | Stopped it by hand. The data was complete. Not fixed in code (one-time step). | Open handles keep Node alive; scripts should close or `process.exit`. |

---

## 13. Interview preparation

### 13.1 The 60-second pitch

> EntertainVerse is a full-stack AI entertainment hub for anime, shows and music. It recommends titles with a reason for every pick, using a hybrid of explicit taste, Gemini embeddings and collaborative filtering, which I evaluated offline: MRR 0.35 against 0.20 for a popularity baseline. It plans what to watch as time-budgeted roadmaps, and uses RAG for spoiler-safe recaps and an in-app assistant. On the social side there are communities, DMs, and watch and listen parties synced over Socket.IO, plus WebRTC voice rooms.
>
> It's Next.js 16 with a custom Node server, Postgres through Prisma, and NextAuth. I made it run on two servers behind an AWS load balancer: Redis for Socket.IO, shared party state, cache invalidation and rate limits; S3 for uploads; health checks and graceful shutdown. I proved it with a Docker test stack that includes a failover test. It ships as a Docker image built in GitHub Actions, with 449 unit tests and Playwright E2E.

### 13.2 Architecture and design

**Why Next.js with a custom server instead of plain `next start`?**
Socket.IO needs a persistent process that owns the HTTP server. The custom `server.ts` creates the server, mounts Socket.IO, and hands everything else to Next. The cost is that it can't run on serverless platforms, so it runs in containers on EC2.

**Why Postgres and Prisma?**
The data is relational: users, follows, memberships, collections and items. It needs constraints (unique reviews, one DM conversation per pair) and transactions. Prisma gives type-safe queries, migrations, and a client-extension hook, which I used for automatic cache invalidation.

**Why JWT sessions instead of database sessions?**
Every request, including the Edge middleware and the Socket.IO handshake, can verify the session without a database lookup. Both servers share the secret, so they need no shared session store. The trade-off is that a JWT can't be revoked before it expires. Role changes take effect on the next sign-in or token refresh.

**How is the code layered?**
Routes and pages are thin. Services hold the business logic and are the only layer that touches Prisma. Validators (Zod) sit at the API edge, and mappers turn rows into view models. A unit test stops client components from importing server-only layers.

### 13.3 Scaling

**What changes when you go from one server to two?**
Anything kept in process memory becomes wrong:
- socket rooms
- party state
- caches
- online counts
- rate-limit counters
- files on disk

Each one moves to a shared place, or gets synced:
- the Redis adapter for emits
- a Redis store with locks for party state
- pub/sub invalidation for the per-server caches
- a cross-server `fetchSockets` for presence
- a Redis sorted-set window for rate limits
- S3 for files

Then the balancer needs health checks and graceful shutdown.

**Why keep an in-memory cache per server instead of caching in Redis?**
Speed, and the value types: embedding `Float32Array`s and Maps of signals would need serialising on every read. The problem is staleness across servers, which pub/sub invalidation solves. Writes are rare compared with reads, so broadcasting invalidations is cheap.

**How do you stop two servers corrupting the same party state?**
A Redis lock per key:
- `SET NX PX 5000` with a random token
- a read-modify-write under the lock
- release with a Lua compare-and-delete, so a lock that expired and was taken by someone else isn't deleted

There's also a TTL on state, so a crash can't leave a party locked or orphaned forever.

**Are sticky sessions required?**
No: all shared state is in Redis or Postgres. Stickiness just keeps a visitor's page and socket on one server, which reduces cross-server chatter and helps Socket.IO's long-polling fallback.

**How does a server leave without dropping users?**
On SIGTERM the health check returns 503 and the balancer stops routing new traffic there. After a drain window, `io.close()` closes the sockets, and their clients reconnect through the balancer to the other server and rejoin their rooms. Party state lives in Redis, so the host, position and members survive. The failover E2E test proves exactly that.

**What's the single point of failure?**
Postgres and Redis on server A. If A dies, B can't serve pages either. Next steps would be RDS Multi-AZ and ElastiCache, and the app wouldn't change, only the URLs.

### 13.4 Realtime

**How do you keep a watch party in sync?**
The server stores the play state, not a video stream. Clients compute the expected position from `positionSec + elapsed since updatedAt`, corrected for clock skew using the server time in each update. Every 2 s they seek if they've drifted more than 1.5 s. Only the host can play, pause or seek.

**Why a WebRTC mesh for voice, and when does it break down?**
A mesh needs no media server, so it's free and simple. Each peer sends audio to every other peer, so the upload cost grows with room size; rooms are capped at 8. TURN is needed for strict NATs. For big rooms you'd use an SFU such as LiveKit.

**How are sockets authenticated?**
The handshake carries the NextAuth session cookie. The server decodes it with `getToken` and the shared secret. Every join (chat, party, voice) also checks community membership on the server.

### 13.5 AI

**Explain your recommender.**
Each title's score is 0.5 × the taste engine (genres, types, languages, quiz answers), plus 0.35 × cosine similarity to the user's taste centroid in Gemini embedding space, plus 0.15 × item-item co-occurrence. History decays with a 30-day half-life. Each pick carries its strongest "anchor" as the explanation.

**How did you evaluate it?**
Leave-one-out: hide each favourite in turn, rank the catalog, and measure HitRate@K and MRR@20 against baselines. Full hybrid MRR was 0.350, popularity 0.203, taste-only 0.189. The dataset is small, so I present the numbers as indicative.

**Why no vector database?**
A few hundred items × 768 dimensions fits in memory, and a dot product over all of them takes microseconds. A vector DB would add an operational dependency with no benefit at this size. Past roughly 100k items I'd use pgvector or a dedicated store.

**What is RAG, and where did you use it?**
Retrieve real data, then generate from it, so the model is grounded and can cite sources. I used it for:
- recaps: episode guides up to your stopping point
- admin imports: metadata APIs plus grounded web research
- the assistant: help articles, catalog, and the user's snapshot

**How do you stop the LLM inventing titles?**
It only selects from catalog IDs I pass in, enforced as enums in the response schema. Facts like runtimes and episode counts come from data, never the model.

**How did you live within the free tier?**
- Two model tiers, with automatic fallback.
- Embeddings paced and resumable.
- A cross-server rate limit on the assistant.
- Caching recaps and query embeddings.
- A non-AI fallback for everything.

### 13.6 DevOps

**Walk me through your deployment.**
GitHub Actions builds a multi-stage Docker image and pushes it to GHCR, tagged `latest` and with the commit SHA. Two EC2 instances in different availability zones run it with Docker Compose. Server A also runs Postgres and Redis, bound to its private IP and reachable only from the app security group.

A PowerShell `up` script starts the instances, creates the ALB and listener, registers targets, opens a Cloudflare quick tunnel for HTTPS, writes the tunnel URL into each server's config, restarts the apps, and waits until the ALB reports both healthy. `down` deletes the ALB and stops the servers to save cost.

**Why is Node PID 1 in your container?**
`docker stop` sends SIGTERM to PID 1. If npm is PID 1, the signal may not reach Node, so there's no graceful shutdown and Docker kills it after the grace period.

**How do you handle secrets?**
Nothing is in git or the image (`.dockerignore` excludes `.env*`). Each server has a `chmod 600` `.env`. S3 access uses an instance role, not keys. The laptop's CLI user is least-privilege.

**How do you roll back?**
Every image is also tagged with its commit SHA: pin the previous SHA in compose and run `up -d`. Database migrations are additive, so older code still runs on the newer schema.

### 13.7 Testing

**What's your test strategy?**
- Fast unit tests (Vitest, a Prisma mock) for services and algorithms.
- An architecture test for module boundaries.
- Playwright E2E against a real production build.
- A Docker stack with two servers and a load balancer, for the things only a distributed setup can show: cross-server DMs, party sync, shared uploads, cache clearing, and failover.

CI runs typecheck, lint, unit tests, build and E2E on every push.

**What bug did testing catch that you'd never have found by hand?**
The failover test found that a reconnecting host lost the host role because of an ordering issue in the join logic ([§12 #8](#12-bugs-that-taught-something)). The sign-out race was reproduced as an E2E test before it was fixed.

### 13.8 Behavioural angles

- **A trade-off you made:** a quick tunnel instead of a domain and ACM, which got HTTPS at zero cost but means a new URL per demo. Skipping backups and load testing to finish was a conscious scope cut, written down.
- **Something you'd do differently:** use managed Postgres and Redis from the start; add a domain so OAuth works in production; write integration tests per service against a real database, alongside the mocks.
- **Ownership:** a full accessibility and responsive audit (axe on every route at 5 widths) took all violations to 0.

---

## 14. Trade-offs and honest limits

| Limit | Impact | Why it's acceptable now / the fix |
|---|---|---|
| **Postgres and Redis only on server A** | If A goes down, B can't serve pages either. The app tier is redundant; the data tier isn't. | Cost. Fix: RDS Multi-AZ + ElastiCache. Only the connection URLs change. |
| **No automated backups** | Losing A's disk loses the data. | Cut to finish (the plan was a nightly `pg_dump` to S3 with 14-day expiry). Fix: RDS snapshots, or that cron. |
| **No load-test numbers** | No measured capacity for one server against two. | Cut to finish (the plan was k6 against the ALB DNS). |
| **The tunnel URL changes every demo** | Links aren't stable; Google sign-in is off in production. | Free HTTPS with no domain. Fix: a domain + ACM certificate on an HTTPS ALB listener. |
| **Quick tunnels have no SLA** | Fine for demos, not for real users. | Same fix as above. |
| **Drain window (10 s) shorter than the ALB's detection (2 × 10 s)** | During a stop, the ALB may send requests for up to about 10 s to a server that has closed. | Clients retry and sockets reconnect. Fix: `SHUTDOWN_DRAIN_MS=25000` (the 30 s grace period allows it). |
| **Target group created with port 80** | Cosmetic. | `up` registers targets with `Port=3000` explicitly. |
| **Uploads are served through the app** | App servers spend bandwidth on files. | Simple, and URLs are backend-agnostic. Fix: CloudFront or signed S3 URLs. |
| **The production seed doesn't exit** (open Redis handle) | A manual stop after "Seed complete". | One-time step. Fix: `process.exit` after disconnect. |
| **WebRTC mesh** | Voice and live hosting are capped at 8 per room; strict NATs need TURN, and none is configured in production. | Fine for small rooms. Fix: a TURN server; an SFU for scale. |
| **JWT sessions can't be revoked early** | A banned user keeps access until the token expires. | Fix: a short expiry plus a deny-list in Redis. |
| **Notifications are polled over HTTP** | Up to a polling interval of delay. | DMs and chat are already pushed. Fix: emit to `user:<id>`. |
| **One flaky mobile E2E check under stack load** | An occasional retry. | Load from six containers plus browsers on one laptop. |
| **The recommender is evaluated on a small dataset** | The numbers are indicative. | Re-run `eval:recommender` as real usage grows. |
| **Media** | Full playback only where an admin adds a licensed URL. | Legal-first by design. |
| **Gemini free tier** | Flash allows about 20 requests/day; search grounding has its own quota. | Automatic Flash-Lite fallback; synopsis-only recaps aren't cached. |

---

## 15. What I would do next

1. **Data tier:** RDS Postgres Multi-AZ and ElastiCache Redis. Server A becomes just another app server.
2. **A domain + ACM:** an HTTPS listener on the ALB, a stable URL, and Google sign-in in production.
3. **Backups and monitoring:** automated snapshots; CloudWatch alarms on target health, CPU and 5xx; structured logs.
4. **Load test:** k6 against one server and then two, to find the real capacity and the first bottleneck (likely Postgres connections or the CPU on t3.small).
5. **Auto Scaling group:** with a launch template, instead of two hand-made servers. Deploys as rolling instance refreshes.
6. **CDN:** CloudFront in front of static assets and uploads.
7. **Media at scale:** TURN in production; an SFU for big talk rooms and live hosting.
8. **Product:** notifications pushed over sockets; learned ranking weights once there's enough interaction data; PWA install.

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **ALB** | Application Load Balancer (AWS, layer 7): routes HTTP/WebSocket to healthy targets. |
| **Target group / health check** | The set of servers behind the ALB, and the URL it polls to decide which are healthy. |
| **Sticky session** | The balancer pins a visitor to one server with a cookie. |
| **Draining** | A server stops getting new traffic but finishes what it has before shutting down. |
| **Graceful shutdown** | Handling SIGTERM by draining, closing connections, then exiting, instead of dying mid-request. |
| **PID 1** | The first process in a container; it receives the container's stop signal. |
| **Multi-stage build** | A Dockerfile with several stages; the final image copies only what it needs. |
| **Security group** | A stateful firewall on an AWS network interface; rules can reference other groups. |
| **IAM role / instance profile** | AWS permissions attached to a server; the SDK gets temporary credentials automatically. |
| **Least privilege** | Grant only the actions needed, then add more as real errors show they're required. |
| **Pub/sub** | Publish a message on a channel; every subscriber gets it. |
| **Socket.IO adapter** | The layer that decides how emits reach sockets; the Redis adapter spreads them across servers. |
| **Distributed lock** | A lock in a shared store (Redis `SET NX PX`) so processes on different machines take turns. |
| **TTL** | Time to live: how long a key or cache entry stays valid. |
| **Stale-while-revalidate** | Serve the stale value now; refresh in the background. |
| **Single-flight** | Concurrent requests for the same missing key share one load. |
| **LRU** | Least recently used: what gets evicted first when the cache is full. |
| **Sliding-window rate limit** | Count requests in the last N ms (not fixed buckets). |
| **WebRTC** | Browser-to-browser audio, video and data. |
| **STUN / TURN** | STUN finds your public address. TURN relays media when a direct connection is impossible. |
| **Mesh / SFU** | Mesh: everyone connects to everyone. SFU: everyone sends once to a server that forwards. |
| **Signalling** | Exchanging the offers, answers and ICE candidates needed to set up a WebRTC connection (done over Socket.IO here). |
| **Embedding** | A vector representing the meaning of a text; similar meanings give nearby vectors. |
| **Cosine similarity / centroid** | The angle-based similarity of two vectors / the (weighted) average vector of a set. |
| **RAG** | Retrieval-augmented generation: fetch real data, then have the LLM answer from it. |
| **HitRate@K / MRR** | Share of hidden items found in the top K / mean of 1/rank. |
| **Leave-one-out** | Hide one known item at a time and see where the model ranks it. |
| **JWT** | A signed token carrying session claims; verified without a database lookup. |
| **Open redirect** | A bug where a `?callbackUrl=` can send users to an attacker's site. |
| **NDJSON** | Newline-delimited JSON: one event per line, which makes streaming progress easy. |
| **RSC** | React Server Components: components rendered on the server that can read data directly. |
| **Edge runtime** | Next's lightweight runtime for middleware: no Node built-ins, no Prisma. |
| **Quick tunnel** | `cloudflared tunnel --url …`: an outbound connection to Cloudflare that gives a temporary public HTTPS URL. |

---

## 17. Command cheat sheet

```bash
# Local development
npm run dev                    # Next + Socket.IO (tsx server.ts)
npm run db:migrate             # create/apply migrations (dev)
npm run db:seed                # catalog, admins, demo users
npm run embed:catalog          # embeddings for the recommender (needs GEMINI_API_KEY)
npm run eval:recommender       # leave-one-out evaluation → docs/recommender-evaluation.md

# Quality
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e               # single server: reset + seed a test DB, build, Playwright
npm run test:e2e:stack         # two servers + nginx + Redis + S3 mock in Docker
npm run test:e2e:stack -- --keep   # leave the stack up at http://localhost:8080

# Production (from the repo root, Windows PowerShell)
.\deploy\up.ps1                # start servers, ALB, tunnel → prints the https URL
.\deploy\down.ps1              # delete the ALB, stop servers

# On a server (ssh ubuntu@<ip>, then cd ~/entertainverse)
docker compose ps
docker compose logs -f app
docker compose pull && docker compose up -d                      # ship the latest image
docker compose run --rm app npx prisma migrate deploy            # server A, after schema changes
curl -s localhost:3000/api/health
```
