# AniVerse — Project Roadmap

The full journey of AniVerse: what was built, in what order, where each area stands today, and
what is still left. For setup and architecture, see [README.md](README.md).

**Last updated:** 25 October 2026 · **Status:** feature scope locked and complete — MVP, AI layer, social AI and live parties; not yet deployed.

---

## At a glance

| | |
|---|---|
| **What it is** | An AI-powered entertainment hub for anime, shows, K-dramas, films and music: discover, plan, collect, discuss. |
| **The problem** | People pay for several streaming services and still lose 20 minutes scrolling. They don't know what to watch next, or in what order. |
| **The answer** | A hybrid recommender that explains every pick, plus *AI mode*: a quiz or chat that turns your mood into a time-budgeted roadmap that tracks itself. Then the social layer: AI Match rooms, synced watch and listen parties, voice talk rooms, and group picks that suit everyone. |
| **Scale today** | 51 pages · 108 API routes · 57 Prisma models · 32 migrations · 80 commits |
| **Stack** | Next.js 16 · React 19 · TypeScript · Tailwind v4 · PostgreSQL + Prisma 6 · NextAuth v5 · Socket.IO · Gemini |

---

## Timeline

### Phase 1 — Foundation & frontend (11–14 Jul 2026)

| What | Commits |
|---|---|
| Next.js project, Tailwind design tokens (colours, type, fonts), shared buttons, chips and cards | `6d6eb8f` `5781fb7` |
| Landing, auth pages and every dashboard page (Home, Discover, For You, Community, Collections, Watchlist), fully responsive; carousel and paginated grid sections | `d78d24c` |
| Detail routes: content, song, artist, collection, profile, community, plus the community dashboard (posts, announcements, chat, stats) | `db55e04` `21193a0` |
| Global search engine in the navbar, plus a full search results route | `a6ff000` |
| Landing reviews auto-slider; onboarding, settings and analytics (Recharts) pages | `a433b82` `6e0b7da` |

### Phase 2 — Backend, auth & admin CMS (14–16 Jul 2026)

| What | Commits |
|---|---|
| Prisma schema on PostgreSQL, register/login APIs, NextAuth JWT sessions, middleware guarding the dashboard | `7323194` |
| Admin role and Admin CMS, then three scoped admins (content / music / artist) with CRUD APIs; catalog rendered from the database; seed data | `9875b84` `ba44eb3` |
| User CRUD for communities, collections and watchlist; catalog search picker in forms | `fc3aa2d` `94d437b` |
| Collections: content vs music, public/private, play route with accent-themed ambience, lyrics | `31b4f3a` |
| Community dashboard CRUD (voice/watch channels, posts, announcements) and Socket.IO realtime chat | `6de65f9` |
| Profile APIs (view/edit/delete), reviews and notifications APIs, live analytics from real events | `b80dfc8` `52b772b` `cab7594` |

### Phase 3 — Real data, testing & social (16–23 Jul 2026)

| What | Commits |
|---|---|
| Hundreds of seeded and manually added catalog items, real descriptions with source links, end-to-end testing | `c7324c9` `3692264` `e3f5f3b` `276cd4f` `14ebbbc` |
| Page loaders and many small fixes | `92cbaa6` `60819ad` |
| Admin end-to-end testing per role; artist→song search fix; collection follows, active filters, synced lyrics and audio settings, accent "fairy" ambience on players | `2759288` |
| Profile overhaul (activity, followed artists, friends, favourites, charts, KPIs, online status); friend requests; private-community join codes | `d86f996` |
| First Google sign-in work, DM fixes, README | `c9606a9` |

### Phase 4 — Finishing pass: auth, onboarding, UX polish (24 Oct 2026)

| What | Commits |
|---|---|
| Google sign-in/sign-up live (Google Cloud OAuth), clearer OAuth error states | `0aec15e` |
| Rebuilt onboarding: better choices and a more personal profile and feed | `96c1731` |
| Skeleton loaders, plus custom `error.tsx` / `not-found.tsx` on every route group | `9bb117d` |
| Denser dashboard: compact cards, tighter section spacing | `866b97c` |
| Zero type and lint errors across the app | `f5a5f84` |
| Design system: one radius scale, type scale, font, colour tokens, a single glow budget | `8dcb550` |
| Accessibility: keyboard focus, reduced motion, live regions, touch targets | `d1cf153` |
| Shared confirm dialog and toasts; button variants, empty states, player shortcuts, image fade-in | `06b65f2` `b2b8967` |
| Honest labels for example data and unfinished features ("Coming soon", "Preview audio") | `0dda88a` |
| Page-level polish and production build fix; tailwind-merge token fix; hover panels; rebuilt collection/community cards | `b785384` `4835e8d` `c22e677` `d427f7b` |
| `seed-active-profile` script: fills an account with realistic activity | `4bcfc4f` |

### Phase 5 — AI-assisted Admin CMS (24–25 Oct 2026)

| What | Commits |
|---|---|
| **AI catalog import + pre-publish review:** search TMDB / AniList; facts are mapped in code, editorial fields drafted by the model; an AI review checks every field | `10d92da` |
| Pluggable AI provider: **Gemini free tier by default, Claude optional** | `48eda59` |
| Faster drafts, fixed vocabularies, TMDB host that works in India (`api.tmdb.org`) | `01fdde8` `a15073b` `02d8130` |
| Live percentage progress (NDJSON streaming) for import and review | `14c24b8` |
| Official trailers and legal "where to watch" (TMDB/JustWatch) on title pages | `07ba038` |
| Music: AI song import from Apple Music (iTunes) and Deezer; official 30-second previews and listen links; lyrics never imported | `8a41f4a` |
| Artists: AI artist import (Deezer photo, MusicBrainz members, debut and native name, Apple Music link) | `2679f0c` |
| Clear-form / reset button on every CMS form | `907cae7` |

### Phase 6 — AI for users: recommender, AI mode, roadmaps (25 Oct 2026)

| Step | What | Commit |
|---|---|---|
| 1 | **Hybrid deep-learning recommender:** `gemini-embedding-001` vectors for every item, plus item-item collaborative filtering, plus watch/listen history; a "why this" reason on every card | `7ec5d93` |
| 2 | **AI taste profile** with full user control: view, edit, download (JSON), wipe, switch off learning | `d3df271` |
| 3 | **AI mode:** Watch / Listen; animated taste quiz *or* chat; on Home, For You and Discover; Gemini Flash / Flash-Lite tiers for the free quota | `99b9a16` |
| 4 | **AI roadmaps:** time-budgeted plans with a written taste analysis; tracked from real activity; swaps; adjust-chat | `85c0248` |
| 5 | Personalised **public collection and community** recommendations | `422ccac` |
| 6 | **Smart collections:** weekly collection ideas learned from behaviour (save or dismiss) | `97bc3bf` |
| 7 | **Offline evaluation** (leave-one-out), README AI section, polish | `3f4c3a1` |

### Phase 7 — Social AI, live parties & the final feature set (25 Oct 2026)

| Step | What | Commit |
|---|---|---|
| 1 | Docs rewrite (README + this roadmap); fixed the `npm run dev` crash caused by a `server-only` import in the socket chain | `ab7ea59` `51759c1` |
| 2 | Removed the old "AI Taste Profile" score bar and the sidebar Notifications link | `0ad5f76` `b435ba4` |
| 3 | **Deeper taste quiz**: worlds, protagonists, endings, intensity, occasions, company, subs/dubs, loved titles, vocals, eras, loved artists | `91914c6` |
| 4 | **Strict daily limit**: a 5-minute warning, then the app locks until midnight; the timezone can't be changed while a limit is active | `65c5232` |
| 5 | **Analytics wired to real-time activity**: session-based watch/listen minutes, taste fit, a live traits radar, a timezone-aware 12-week rhythm | `4379d64` |
| 6 | **AI Match**: taste circles, nearby / country / worldwide, then broadcast rooms. The creator opens a room and matching users get a popup + notification and join in one tap | `5dad7f3` `0830afb` |
| 7 | **Live parties**: synced watch parties and listen parties over Socket.IO (host control, skew correction, chat, reactions, queue) | `b37c345` |
| 8 | **Talk rooms**: WebRTC voice with Socket.IO signalling | `56f50b1` |
| 9 | **Watch trailer in the hero panel**: plays in place; the poster stays the default. 98 trailers backfilled | `bfa57d8` |
| 10 | **Group AI mode**: "What should we watch / listen to?" for everyone in a party, with a fit for each person | `45e7ded` |
| 11 | **Catch me up**: spoiler-safe recaps up to your stopping point, using RAG over episode guides or the web; cached and shared | `a7c4b54` |
| 12 | **Taste DNA history + AniVerse Wrapped**: monthly taste strands and eras; a story of your year with an AI-named persona and a share card | `1fbea9f` |

---

## Where every area stands

| Area | Status | Notes |
|---|---|---|
| UI, navigation, responsive layout | ✅ Done | 320px → desktop; drawer + bottom nav on mobile; skeletons, error and not-found pages everywhere |
| Design system & accessibility | ✅ Done | Tokens in `app/globals.css`; focus rings, reduced motion, live regions |
| Auth | ✅ Done | Credentials + Google (live); Discord wired but needs credentials |
| Onboarding & taste profile | ✅ Done | DB-persisted; feeds the recommender |
| Catalog (content, music, artists) | ✅ Done | 101 titles, 80 tracks, 18 artists in the dev DB |
| Admin CMS (5 areas, role-scoped) | ✅ Done | Plus AI import, AI review, clear-form |
| Discover / For You / search | ✅ Done | Hybrid-ranked, with reasons |
| Collections, watchlist, favourites | ✅ Done | Collaborators, follows, play mode, smart collection ideas |
| Profiles & friends | ✅ Mostly | Two profile KPI tiles are still placeholders |
| Communities (posts, chat, join codes) | ✅ Done | Realtime chat over Socket.IO |
| Direct messages | ✅ Done | Socket.IO + REST, read state |
| Notifications | 🟡 Works | DB-backed, polled over HTTP; not pushed over sockets; reachable from the bell (no longer in the sidebar) |
| Analytics | ✅ Done | Real-time watch/listen sessions → Recharts; taste fit, live traits, Taste DNA history |
| Media playback | 🟡 Legal-first | Official trailers, 30s previews and listen/watch links; full video/audio only where an admin adds a licensed URL; otherwise demo audio |
| Watch / listen parties | ✅ Done | Socket.IO sync with host control, chat, reactions and a shared queue; state is in memory |
| Talk rooms (voice) | ✅ Done | WebRTC mesh over public STUN; good for small rooms (TURN/SFU needed at scale) |
| AI Match rooms | ✅ Done | Popup + notification invites; tested with seeded demo accounts |
| Catch me up, Taste DNA, Wrapped | ✅ Done | Recaps tested against episode-guide and synopsis grounding; Wrapped tested on a seeded active profile |
| Daily limit | ✅ Done | Heartbeat-based; locks until local midnight |
| AI recommender, AI mode, roadmaps, smart collections, group picks | ✅ Done | Tested with live scripts; manual browser pass in progress |
| Automated tests | 🔴 None | No unit/e2e suite yet; the recommender has an offline evaluation script |
| Deployment | 🔴 Not yet | Runs locally (`npm run dev`); no hosting / CI config in the repo |

---

## What's left

### Must do before calling it shipped

1. **Manual test pass in the browser**, at phone and desktop widths:
   - AI mode quiz and chat, roadmap actions, smart collections, the AI profile page
   - AI Match rooms with several accounts
   - watch/listen parties and talk rooms across two browsers
   - Catch me up, Wrapped (including the share card) and the daily-limit lock
2. **Deploy:** pick a host that supports the custom `server.ts` (Socket.IO needs a long-running Node server, so serverless-only hosting won't carry realtime). Set production env vars, then run `prisma migrate deploy`, `npm run db:seed` (if needed) and `npm run embed:catalog`.
3. **Production secrets:** a fresh `AUTH_SECRET`, Google OAuth redirect URI for the production domain, and a Gemini key (or a paid tier; see the quota note below).
4. **Grow the catalog** through the AI import (e.g. cozy and slice-of-life anime are thin today), then re-run `npm run embed:catalog` and `npm run eval:recommender`.

### Should do

5. **Automated tests:** unit tests for the recommender maths (`lib/recommender`, `lib/roadmap/runtime.ts`), API tests for the AI routes, and a Playwright smoke test of sign-in → AI mode → roadmap.
6. **CI:** run lint, typecheck, build and the recommender evaluation on every push.
7. **Socket-pushed notifications** instead of HTTP polling.
8. **Replace the two placeholder profile KPI tiles** with real metrics.
9. **Untested admin paths:** the "Research on the web instead" fallback for music and artists has never been run end to end.
10. **Rate limiting** on the AI routes (chat, roadmap, recap) per user, to protect the shared Gemini quota.
11. **Discord sign-in:** add credentials or remove the button.

### Stretch

12. **Voice and parties at scale:**
    - a TURN server for strict NATs
    - an SFU (e.g. LiveKit) for big rooms
    - Redis-backed party state, so parties survive restarts and work across several server instances
13. **Roadmap reminders:** a weekly nudge ("2 h left in this week's plan") via notifications.
14. **Learned ranking weights:** once there's enough real interaction data, tune the 50/35/15 blend from the evaluation instead of fixed weights.
15. **Multilingual UI** (the settings already store a language preference).
16. **Mobile app shell** (PWA install, offline lists).

---

## Known limitations & gotchas

| Issue | Impact | Workaround |
|---|---|---|
| Gemini free tier: Flash allows ~20 requests/day | AI import, review and roadmaps can hit the cap | Automatic fallback to Flash-Lite; or set a paid key / `AI_PROVIDER=claude` |
| Embeddings: 100 per minute on the free tier | Big catalog backfills take minutes | `embed:catalog` paces itself and resumes |
| `api.themoviedb.org` and `api.jikan.moe` blocked by some Indian ISPs | TMDB / Jikan calls fail | Code uses `api.tmdb.org`; Jikan is optional |
| Deezer track search returns nothing from India | Fewer music search results | Apple Music (iTunes) is the primary source; Deezer still provides artist photos |
| `prisma generate` hits `EPERM` on Windows while the dev server runs | Engine DLL can't be replaced | Stop `npm run dev`, regenerate, restart |
| The dev server can leave a half-written `.next/dev/types/routes.d.ts` | `next build` fails on that file | Restart `npm run dev` (it regenerates the file) |
| Small seeded dataset | Evaluation numbers are indicative only | Re-run `npm run eval:recommender` as real usage grows |
| `gemini-flash-latest` can take minutes to answer at busy times | Slow admin imports and roadmap builds | User-facing calls (chat, recaps, group picks, Wrapped) run on Flash-Lite |
| Google Search grounding has its own free daily quota | Web-grounded recaps and web research fail for the rest of the day | Recaps fall back to the synopsis, say so, and aren't cached, so a grounded recap is written once quota returns |
| Party state lives in server memory | A restart ends live parties; a single server instance only | Fine for one Node server; Redis for scale |
| WebRTC mesh over public STUN | Some strict networks can't connect; CPU grows with room size | Add TURN; SFU for big rooms |
| Some admin-entered episode descriptions are placeholders | Recaps for those titles fall back to web/synopsis | Re-import the title with AI import |

---

## Recommender results (latest)

From `npm run eval:recommender` (leave-one-out; full table in [docs/recommender-evaluation.md](docs/recommender-evaluation.md)):

| Titles | HitRate@10 | MRR@20 |
|---|---:|---:|
| Popularity baseline | 59.3% | 0.203 |
| Taste engine only | 44.4% | 0.189 |
| + Semantic embeddings | 55.6% | 0.285 |
| **Full hybrid** | **66.7%** | **0.350** |
