# AniVerse

**AniVerse** is an AI-powered entertainment hub for anime, movies, shows, K-dramas, music, collections, communities, DMs, and personal analytics. Users discover content matched to their taste, organize watchlists and playlists, join fan communities, message friends, and track how they watch and listen over time.

This repository is a **full-stack Next.js application**: PostgreSQL + Prisma, NextAuth (JWT), ~81 REST APIs, Socket.IO realtime (community chat + DMs), role-based admin CMS, and a Figma-aligned dark UI.

---

## Progress Report (July 2026)

| Layer | Progress | Notes |
|------|----------|-------|
| UI / screens / navigation | **~98%** | Landing → auth → onboarding → dashboard → detail → admin all built |
| Auth + middleware + sessions | **~95%** | Credentials live; Google/Discord wired (need env credentials) |
| Database + Prisma models | **~95%** | Full schema + migrations; seed + admin roles |
| REST API surface | **~95%** | Catalog, social, CRUD, analytics, admin, DM |
| Onboarding + taste / For You | **~95%** | Persisted `TasteProfile` + recommendations |
| Discover / search / feeds | **~95%** | Prisma-backed feeds + autocomplete |
| Collections / watchlist / favorites | **~95%** | Create, follow, collaborate, play flows |
| Profile + friends | **~90%** | Real KPIs/activity; 2 placeholder KPI slots remain |
| Communities (posts / chat) | **~90%** | Join codes, posts, likes, Socket.IO chat |
| Direct messages | **~85%** | Full service + UI + sockets; requires Prisma migrate/generate for read-state |
| Notifications | **~90%** | DB-backed; polled every 30s (not socket-pushed) |
| Analytics | **~95%** | Watch/listen events → Recharts dashboard + profile reuse |
| Admin CMS | **~95%** | Content / music / artist / collections / communities by role |
| Media playback | **~70%** | Players exist; many tracks fall back to demo audio; video needs `videoUrl` |
| Voice / watch parties | **~40%** | Channel CRUD + UI shells only — no WebRTC / A/V sync |
| Docs / ops polish | **~90%** | This README; env example; seed scripts |

### Overall: **~90% complete** for the planned MVP product scope

What remains for “done done”:

1. Apply DM read-state migration + regenerate Prisma client (`db:migrate` / `db:generate`) so DMs render and send reliably  
2. Configure Google (and optionally Discord) OAuth credentials  
3. Attach real `audioUrl` / `videoUrl` catalog media (or keep demo previews)  
4. Optional stretch: WebRTC voice rooms + synced watch parties  
5. Optional: push notifications over Socket.IO instead of HTTP polling  

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, RSC) + custom `server.ts` |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Framer Motion (landing), Lucide, CVA |
| Auth | [NextAuth.js v5](https://authjs.dev) — JWT sessions |
| Database | PostgreSQL + Prisma 6 |
| Validation | Zod 4 |
| Realtime | Socket.IO 4 (`/api/socket/io`) |
| Charts | Recharts 3 |
| Security | bcryptjs passwords |

> Use `npm run dev` / `npm start` (runs `tsx server.ts`). Plain `npm run dev:next` starts Next **without** Socket.IO — community chat and live DMs will not work.

---

## User Flow (end-to-end)

```
Landing (/)
    │
    ├── Login (/login)
    │       ├── Credentials → JWT session
    │       └── Google / Discord (if env set) → findOrCreateOAuthUser → JWT
    │               │
    │               └── /api/auth/redirect-destination
    │                       ├── onboarding incomplete → /onboarding
    │                       └── else → /dashboard
    │
    └── Signup (/signup) → POST /api/auth/register → sign-in → /onboarding
            │
            ▼
        Onboarding (/onboarding)
        Taste quiz → POST /api/onboarding/* → TasteProfile in DB
        (+ localStorage cache for UI)
            │
            ▼
        Dashboard (/dashboard)
            ├── Home / Discover / For You / Watchlist / Collections / Favourites
            ├── Analytics / Messages (DMs) / Notifications / Community / Settings
            ├── Global search (/search?q=…)
            └── Detail + play routes
                    ├── /content/[id] (+ /watch)
                    ├── /song/[id]
                    ├── /artist/[id] (+ /play)
                    ├── /collection/[id] (+ /play)
                    ├── /profile/[handle]
                    └── /community/[slug]
                            └── /dashboard/[section]
                                posts · chat · anime-chat · watch · voice · …

Admin (/admin) — role-gated CMS for catalog + communities
```

### Auth wiring

| Piece | Path | Role |
|-------|------|------|
| NextAuth config | `lib/auth.ts` | Credentials + optional Google/Discord; JWT callbacks |
| OAuth user upsert | `lib/services/user.service.ts` → `findOrCreateOAuthUser` | Links `Account` + `User` |
| Guards | `lib/auth-guards.ts`, `lib/api-auth.ts` | Server pages + API routes |
| Middleware | `middleware.ts` | Guests blocked from `/dashboard`, `/onboarding`, `/admin` |
| Social UI | `components/auth/social-buttons.tsx` | Buttons enabled via `isGoogleAuthEnabled()` / `isDiscordAuthEnabled()` |
| Handlers | `app/api/auth/[...nextauth]/route.ts` | Auth.js routes |

**Credentials:** real DB users + bcrypt (seeded demo users exist).  
**Google redirect URI:** `http://localhost:3000/api/auth/callback/google`

---

## Architecture

```
Browser / Client components
    │
    ├── REST → app/api/** → lib/services/** → Prisma → PostgreSQL
    │
    ├── Socket.IO client → server.ts → lib/socket/server.ts
    │                         ├── community chat rooms
    │                         └── DM conversation rooms
    │
    └── RSC pages → lib/data/** (thin accessors) → lib/services/** → Prisma
```

| Layer | Responsibility |
|-------|----------------|
| `app/**/page.tsx` | Routes, layouts, server data load |
| `components/**` | UI by domain |
| `lib/data/**` | Page-oriented accessors (now mostly Prisma-backed) |
| `lib/services/**` | Business logic (auth, DM, community, feed, analytics…) |
| `lib/mappers/**` | DB → UI view models |
| `lib/validators/**` | Zod schemas for API bodies |
| `lib/socket/**` | Realtime auth, rooms, broadcast |
| `prisma/schema.prisma` | Source of truth for data model |

---

## Routes Reference

### Public

| Route | Description |
|-------|-------------|
| `/` | Marketing landing |
| `/login` | Credentials + optional OAuth |
| `/signup` | Register → onboarding |
| `/search?q=` | Full ranked search results |

### Authenticated app

| Route | Description |
|-------|-------------|
| `/onboarding` | Taste quiz (DB-persisted) |
| `/dashboard` | Home feed |
| `/dashboard/discover` | Browse + Active Taste chips |
| `/dashboard/for-you` | Personalized carousels |
| `/dashboard/watchlist` | Saved items |
| `/dashboard/collections` | Collection hub |
| `/dashboard/favorites` | Favourites hub |
| `/dashboard/analytics` | Personal analytics |
| `/dashboard/messages` | Direct messages (friends) |
| `/dashboard/notifications` | Notification center |
| `/dashboard/community` | Community hub |
| `/dashboard/settings` | Profile, account, privacy, prefs |

### Detail & play

| Route | Description |
|-------|-------------|
| `/content/[contentid]` | Show/anime/movie detail |
| `/content/[contentid]/watch/...` | Video player + watch events |
| `/song/[songid]` | Track detail + preview |
| `/artist/[artistid]` | Artist detail |
| `/artist/[artistid]/play/...` | Artist play flow |
| `/collection/[collectionid]` | Unified collection (content or music `kind`) |
| `/collection/[collectionid]/play/...` | Collection player |
| `/music-collection/[id]` | Legacy redirect → `/collection/...` |
| `/profile/[userid]` | Public/friend-gated profile |
| `/profile/[userid]/friends` | Friends list |
| `/community/[communityid]` | Community landing |
| `/community/[id]/dashboard/[section]` | In-community dashboard |

**Community sections:** `posts` · `chat` · `anime-chat` · `watch-channel` · `voice-channel` · `announcements` · `analytics` · `settings`

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | CMS overview |
| `/admin/content`, `/music`, `/artists`, `/collections`, `/communities` | Role-gated CRUD UIs |

**Roles:** `USER` · `CONTENT_ADMIN` · `MUSIC_ADMIN` · `ARTIST_ADMIN` · `SUPER_ADMIN`

---

## API Surface (grouped)

### Auth
- `POST/GET /api/auth/[...nextauth]` — session  
- `POST /api/auth/register` — signup  
- `GET /api/auth/redirect-destination` — post-login path  
- `POST /api/auth/clear-stale-session` — clear orphan JWT  

### Onboarding
- `/api/onboarding/profile` · `/complete` · `/recommendations`

### Users & social
- `/api/users/search` · `/api/users/[handle]` · `/follow`  
- `/api/users/me` · `/me/settings` · `/me/password` · `/me/delete`  
- `/api/friend-requests/[id]/accept|reject`

### Catalog engagement
- Content: `favorite`, `watchlist`, `reviews`, `view`, `watch-start`, `watch-event`, `engagement`  
- Song: `favorite`, `reviews`  
- Artist: `favorite`, `follow`, `play`, `reviews`  
- Collections: CRUD items, favorite, follow, play, collaborators  
- Watchlist: list + item routes  
- Reviews: update/delete + like  

### Communities
- Create/list/join, join-by-code, invite-friends, members  
- Posts + likes, chat messages, reviews  
- Voice / watch channel CRUD  

### DMs
- `/api/dm/conversations`  
- `/api/dm/conversations/[id]/messages` · `/read`  
- `/api/dm/send` · `/api/dm/messages/[id]` · `/api/dm/unread`

### Other
- `/api/search` — autocomplete  
- `/api/upload` — files → `public/uploads`  
- `/api/analytics` — user analytics  
- `/api/notifications` · `/[id]`  
- `/api/admin/**` — CMS REST for catalog + communities  

---

## Data Model (Prisma)

**Identity:** `User`, `Account`, `TasteProfile`, `UserPreferences`  
**Catalog:** `Content` (+ seasons/episodes/characters), `MusicTrack`, `Artist`, genres, catalog reviews  
**Library:** watchlist, collections (+ items/favorites/follows/collaborators), content/artist/track favorites  
**Social:** `UserFollow`, `FriendRequest`, communities (members, posts, chat, voice/watch channels), reviews + likes  
**Messaging:** `DirectConversation`, `DirectMessage`, `DirectConversationRead`  
**Alerts / analytics:** `Notification`, `Rating`, `WatchEvent`, `ListenEvent`

---

## Feature Wiring Map

| Feature | UI | Service | Persistence | Realtime |
|---------|----|---------|-------------|----------|
| Login / signup | `components/auth/*` | `user.service` | `User` + bcrypt | — |
| Google / Discord | Social buttons | `findOrCreateOAuthUser` | `Account` + `User` | — |
| Onboarding | `components/onboarding/*` | `onboarding*.service` | `TasteProfile` | — |
| Discover / For You | Dashboard pages | `feed.service` + data accessors | Catalog + taste | — |
| Watch / listen | Play views | `content-play` / music services | `WatchEvent` / `ListenEvent` | — |
| Watchlist / favorites | Forms + hubs | `watchlist` / `favorite` services | Library tables | — |
| Collections | Hub + detail + play | `collection*.service` | `Collection*` | — |
| Profile | `components/profile/*` | `user-profile.service` | Aggregations | — |
| Friends | Profile + buttons | `follow.service` | `FriendRequest` / follows | Notifications |
| Notifications | Bell + page | `notification.service` | `Notification` | HTTP poll 30s |
| Community chat | Community dashboard | `community*.service` | `CommunityChatMessage` | Socket.IO |
| DMs | Messages panel | `dm.service` | DM tables | Socket.IO + REST |
| Analytics | Charts | `analytics.service` | Events + ratings | — |
| Admin CMS | `app/admin/**` | Admin APIs + guards | Catalog models | — |

### Realtime details

- Custom server: `server.ts`  
- Server socket: `lib/socket/server.ts` (auth via session cookie)  
- Client env: `NEXT_PUBLIC_SOCKET_URL` (defaults to same origin)  
- Community: `hooks/use-community-chat.ts`  
- DMs: `components/dashboard/dashboard-messages-panel.tsx`  

### Known media behavior

- Missing track `audioUrl` → demo SoundHelix MP3 (`lib/music-preview.ts`)  
- Missing content `videoUrl` → empty / non-playable player until admin sets URL  
- Voice & watch channels store membership/metadata only — not live A/V  

---

## Project Structure

```
aniverse-application/
├── app/
│   ├── (auth)/                 # login, signup
│   ├── admin/                  # role-gated CMS
│   ├── api/                    # ~81 REST routes
│   ├── dashboard/              # app hubs (incl. messages, favorites)
│   ├── content|song|artist|collection|community|profile|search|onboarding/
│   ├── layout.tsx · page.tsx · globals.css
│   └── …
├── components/                 # domain UI (auth, dashboard, community, admin, …)
├── hooks/                      # chat, drafts, layout helpers
├── lib/
│   ├── auth.ts · auth-guards.ts · api-auth.ts
│   ├── data/                   # page accessors
│   ├── services/               # business logic
│   ├── mappers/ · validators/ · socket/
│   └── …
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── scripts/                    # seed recovery, posters, DB checks
├── types/                      # domain + next-auth.d.ts
├── public/                     # images + uploads
├── middleware.ts               # protect dashboard / onboarding / admin
├── server.ts                   # Next + Socket.IO
├── .env.example
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+  
- PostgreSQL  
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
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `AUTH_SECRET` | Yes | JWT signing (`npx auth secret`) |
| `AUTH_URL` / `NEXTAUTH_URL` | Yes (dev) | e.g. `http://localhost:3000` |
| `ADMIN_*` | Seed | Super-admin account |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Google login |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Optional | Discord login |
| `NEXT_PUBLIC_SOCKET_URL` | Optional | Socket client URL |
| `NEXT_PUBLIC_APP_URL` | Optional | Socket CORS / public app URL |

### 3. Database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

If DMs fail with missing `directConversationRead` / unknown `reads` include, stop the dev server and re-run `db:migrate` + `db:generate`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Seeded accounts (from `.env.example` / seed)

| Role | Typical login |
|------|----------------|
| Super admin | `admin@aniverse.local` / `Admin123!` |
| Content admin | `content@aniverse.local` / `Content123!` |
| Music admin | `music@aniverse.local` / `Music123!` |
| Artist admin | `artist@aniverse.local` / `Artist123!` |
| Demo users | Created by seed (e.g. local demo emails) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with Socket.IO (`tsx server.ts`) |
| `npm run dev:next` | Next-only (no Socket.IO) |
| `npm run build` | Production build |
| `npm start` | Production server + Socket.IO |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:push` | Prisma db push |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed catalog + admins + demo users |
| `npm run db:reset` | Wipe + reseed |
| `npm run db:recovery` | Recovery seed script |

---

## Design System (brief)

Tokens live in `app/globals.css` (Tailwind v4 `@theme`). Use them instead of arbitrary values.

| Token | Scale / rule |
|---|---|
| **Radius** | `lg` 8 · `xl` 12 · `2xl` 16 · `card` 20 · `3xl` 24 · `full`. Same component type = same radius (every card is `rounded-card`). |
| **Type** | `micro` 11 (chip/badge labels only) · `caption` 12 · `small` 13 · `body` 15 · `subtitle` 16 · `lead` 18 · `heading` 24 · `title` 32 · `display` 64 (landing hero only). Nothing readable below 12px. |
| **Font** | Geist (via `next/font`) on every platform. |
| **Colour** | Brand `brand-purple → brand-fuchsia → brand-magenta`, accent text `brand-pink`; surfaces `background`, `surface`, `night`, `popover`, `popover-deep`; status `online`, `gold`, `teal`. Raw values for JS live in `lib/brand-colors.ts`; chart series in `components/charts/chart-theme.ts`. Genre chip gradients are tuned for WCAG AA text contrast. |
| **Glow** | One soft 32px halo. Reserved for the primary CTA, active nav item, now-playing state and card hover — everything else uses `shadow-card-lift` or plain elevation. |
| **Spacing** | Dashboard pages: `max-w-[1200px]` column, `gap-5 sm:gap-6` between sections, `px-4 sm:px-6 lg:px-8` padding. |

Shared building blocks: `Button` / `GradientButton` (primary · secondary · ghost · destructive, `loading` prop), `EmptyState` (with `compact` + link action), `useConfirm()` / `useToast()` from `FeedbackProvider`, `ComingSoonNotice` for unfinished features, route skeletons in `components/skeletons/`. Focus rings and `prefers-reduced-motion` handling are global.

---

## What's Left

1. **Stabilize DMs** — ensure migration `dm_read_state` is applied and Prisma client regenerated  
2. **Turn on Google auth** — set `AUTH_GOOGLE_*` + Google Cloud redirect URI  
3. **Catalog media** — populate real `videoUrl` / `audioUrl` via admin CMS  
4. **Stretch** — WebRTC voice, synced watch parties, socket-pushed notifications  
5. **Polish** — remove profile KPI placeholders; retire empty `components/navigation/`

---

## License

Private project — all rights reserved.
