# Number Munchers — Modernized

A fast, modern reimagining of the classic Number Munchers game, built for the web with a WebAssembly game engine written in TypeScript. Playable on desktop and mobile, with persistent high scores and social sign-in.

---

## Vision

Number Munchers was one of the great educational arcade games. This project brings it back with:

- Fluid, high-FPS gameplay that feels responsive on any device
- A clean, modern visual style — no compromises on polish
- Cross-platform input: mouse on desktop, touch on mobile
- Global leaderboards to compete and compare scores

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Game Engine | TypeScript → WASM | Compiled via [AssemblyScript](https://www.assemblyscript.org/) — game logic, grid state, and rendering loop all run in WASM for maximum performance |
| Renderer | WebGL / Canvas | High-FPS rendering driven from the WASM module, runs entirely in the browser |
| Frontend | [Nuxt](https://nuxt.com/) (Vue 3) | Pages, UI components, game canvas host, auth flow |
| Backend API | Nuxt server routes (Nitro) | `server/api/` endpoints for scores and auth — same codebase, no separate service |
| Hosting | [Cloudflare Workers](https://workers.cloudflare.com/) | Nuxt deployed via Nitro's CF Workers preset; edge-rendered, globally distributed |
| Auth | OAuth 2.0 — Google | Social sign-in via Google using [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils); JWT session stored in a secure cookie |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite-compatible database bound to the Worker; same schema as local SQLite |
| Static Assets | Cloudflare Workers Assets | WASM binary and static files served from the same Worker |

### Key Packages

| Package | Purpose |
|---|---|
| [VueUse](https://vueuse.org/) | Composable utilities — `useEventListener`, `useRafFn` (RAF game loop), `usePointer`, `useFullscreen`, `useStorage` for local prefs |
| [Pinia](https://pinia.vuejs.org/) | Global game state — current score, lives, level, auth session, leaderboard cache |
| [shadcn-ui for Vue](https://www.shadcn-vue.com/) | Accessible, unstyled-by-default UI components (dialogs, buttons, tables) for menus and leaderboard screens |
| [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) | OAuth provider wiring + secure cookie session — minimal setup for Google, easy to extend |
| [AssemblyScript](https://www.assemblyscript.org/) | TypeScript-to-WASM compiler for the game engine |
| [Drizzle ORM](https://orm.drizzle.team/) | Lightweight, type-safe SQL ORM for D1 — schema in TypeScript, auto-generated migrations, zero-runtime overhead ideal for edge |

---

## Gameplay

Number Munchers is a grid-based game where the player navigates a character across a board of numbers, eating the ones that satisfy the current rule (e.g. "multiples of 3", "numbers greater than 12"). Enemies patrol the grid and the player must avoid them.

### Core mechanics

- **Grid** — NxM board of numbers, randomly generated per round
- **Rule** — displayed at the top; changes every level
- **Muncher** — player-controlled character that eats correct numbers
- **Troggles** — enemy units that patrol and reset eaten cells
- **Scoring** — points per correct eat; bonus for clearing the board; penalty for eating wrong numbers
- **Lives** — player loses a life when caught by a Troggle or eating a wrong number

### Input

| Platform | Control |
|---|---|
| Desktop | Arrow keys to move, Space/Enter to eat; mouse click on a cell also works |
| Mobile | Tap a cell to move and eat; swipe for directional movement |

---

## Build Roadmap

Work is broken into phases. Each phase should be fully working before moving to the next — the game is playable (as a guest, locally) after Phase 3.

---

### Phase 1 — Project Scaffold

> Goal: empty Nuxt app running locally with all tooling in place.

- [x] Init Nuxt project with TypeScript (`nuxi init`)
- [x] Configure `nuxt.config.ts` — enable `@tailwindcss/vite`, `@pinia/nuxt`, `nuxt-auth-utils`, `@vueuse/nuxt`
- [x] Install core packages: `vueuse`, `pinia`, `@pinia/nuxt`, `nuxt-auth-utils`, `shadcn-vue`, `tailwindcss`
- [x] Initialize shadcn-vue (`npx shadcn-vue@latest init --defaults`)
- [x] Init AssemblyScript engine package under `engine/` (`npx asinit .`)
- [x] Add `engine:build` npm script — compiles `.wasm` into `public/` for Nuxt to serve
- [x] Smoke test: `npm run dev` serves a blank Nuxt page with no errors

---

### Phase 2 — Database & Auth

> Goal: Google sign-in works end-to-end locally; user row persisted in local D1.

- [ ] Install **Drizzle ORM**: `npm install drizzle-orm @cloudflare/workers-types`
- [ ] Create `drizzle.config.ts` — D1 driver configuration (schema path, migrations output)
- [ ] Define `server/db/schema.ts` — Drizzle schema for `users` and `scores` tables using ORM
- [ ] Generate initial migration: `npx drizzle-kit generate:sqlite`
- [ ] Apply migration locally: `wrangler d1 migrations apply DB --local`
- [ ] Implement `server/db/index.ts` — Drizzle client bound to D1; typed query helpers (insert, select, update user/score)
- [ ] Configure `nuxt-auth-utils` Google provider in `nuxt.config.ts`
- [ ] Implement `server/api/auth/google.get.ts` — OAuth redirect
- [ ] Implement `server/api/auth/google.callback.get.ts` — exchange code, upsert user via Drizzle, set session cookie
- [ ] Add `server/middleware/session.ts` — attach decoded session to `event.context.user`
- [ ] Expose `useUserSession()` composable on the frontend (provided by nuxt-auth-utils)
- [ ] Sign-in / sign-out buttons in app shell; guest state when not signed in

---

### Phase 3 — WASM Game Engine

> Goal: core game loop runs in WASM, playable in the browser (no UI polish yet).

- [ ] `engine/assembly/rules.ts` — rule evaluation functions (multiples, factors, primes, comparisons, equals)
- [ ] `engine/assembly/grid.ts` — grid init, number placement, seeded RNG
- [ ] `engine/assembly/muncher.ts` — position, move, eat action, life logic
- [ ] `engine/assembly/troggle.ts` — enemy spawn, basic patrol AI
- [ ] `engine/assembly/game.ts` — main game loop tick, state machine (playing / dead / level-clear)
- [ ] `engine/assembly/index.ts` — exported WASM API surface (`init`, `tick`, `move`, `eat`, `getState`)
- [ ] Build and verify `.wasm` output size and exported symbols
- [ ] `app/composables/useGameEngine.ts` — load `.wasm`, instantiate, wrap exported API
- [ ] `app/composables/useInput.ts` — keyboard + mouse + touch → unified directional/action events
- [ ] `app/composables/useRenderer.ts` — Canvas 2D renderer reading state from WASM each frame
- [ ] `app/components/GameCanvas.vue` — mounts canvas, wires engine + input + renderer via `useRafFn`
- [ ] `app/pages/index.vue` — render `<GameCanvas />`, confirm game boots and is playable

---

### Phase 4 — Game UI & Polish

> Goal: the game looks and feels good; HUD is clear; menus work on desktop and mobile.

- [ ] `app/components/GameHUD.vue` — score, lives, level number, current rule displayed above canvas
- [ ] Start screen — rule display, "Press Start" prompt, difficulty selector
- [ ] Game-over screen — final score, personal best (if signed in), play again button
- [ ] Level-clear animation — brief pause, new rule announcement, next level transition
- [ ] Responsive canvas scaling — fills viewport on mobile, centered with max-width on desktop
- [ ] Touch controls — tap-to-move and on-screen D-pad for mobile (toggle based on `usePointer`)
- [ ] Visual polish — smooth movement interpolation, eat animation, Troggle animations
- [ ] Sound effects (optional stretch — Web Audio API, short clips only)

---

### Phase 5 — Scores & Leaderboard

> Goal: scores saved to D1, leaderboard page live in production.

- [ ] `server/api/scores/index.post.ts` — validate session (allow guest), insert score row
- [ ] `server/api/scores/index.get.ts` — return top N scores with display names; support `?ruleset=` filter
- [ ] Submit score automatically on game-over (fire-and-forget fetch)
- [ ] `app/components/LeaderboardTable.vue` — shadcn Table, sortable by score/level/date
- [ ] `app/pages/leaderboard.vue` — fetch leaderboard via `useFetch`, show personal best highlighted
- [ ] Personal best indicator in HUD during gameplay (read from Pinia, populated on session load)

---

### Phase 6 — Cloudflare Deployment & Production Hardening

> Goal: fully deployed to Cloudflare Workers, stable, and observable.

- [ ] Add `wrangler.toml` — Workers name, D1 binding declaration (`DB`)
- [ ] Configure `nuxt.config.ts` — set `nitro.preset = 'cloudflare-module'`
- [ ] Create D1 database: `wrangler d1 create number-munchers`
- [ ] Apply migrations to production D1: `wrangler d1 migrations apply DB`
- [ ] Set CF secrets: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`, `NUXT_SESSION_SECRET`
- [ ] Add authorized redirect URI in Google Cloud Console for the production domain
- [ ] Smoke test: `npm run deploy` deploys successfully to CF Workers
- [ ] Rate-limit `POST /api/scores` (CF Workers rate limiting or simple IP check)
- [ ] `robots.txt` and basic SEO meta tags
- [ ] Test full flow on mobile (iOS Safari + Android Chrome)
- [ ] Confirm 60 FPS on mid-range mobile hardware
- [ ] Set up GitHub Actions CI — lint, type-check, WASM build, deploy on merge to `main`

---

## Future Ideas (Post-MVP)

- **Friend challenges** — share a seed/link to challenge a friend to beat your score on the same board
- **Smart ad placements** — non-intrusive ads shown between levels or on the leaderboard screen, never during active gameplay

---

## Project Structure (Planned)

```
number-munchers/
├── engine/                        # AssemblyScript WASM game engine
│   ├── assembly/
│   │   ├── grid.ts                # Grid state and number generation
│   │   ├── muncher.ts             # Player logic
│   │   ├── troggle.ts             # Enemy AI
│   │   ├── rules.ts               # Rule evaluation (multiples, primes, etc.)
│   │   └── index.ts               # Main game loop, exported WASM API
│   ├── build/                     # Compiled .wasm output (gitignored)
│   └── asconfig.json
│
├── app/                           # Nuxt application root
│   ├── pages/
│   │   ├── index.vue              # Game canvas page
│   │   └── leaderboard.vue        # High score table
│   ├── components/
│   │   ├── GameCanvas.vue         # Mounts canvas, boots WASM, drives render loop
│   │   ├── GameHUD.vue            # Score, lives, current rule display
│   │   └── LeaderboardTable.vue
│   ├── composables/
│   │   ├── useGameEngine.ts       # WASM loader and JS↔WASM bridge
│   │   ├── useInput.ts            # Keyboard, mouse, and touch unified input
│   │   └── useRenderer.ts        # WebGL/Canvas renderer
│   └── assets/
│       └── game.wasm              # Copied from engine/build at build time
│
├── server/                        # Nitro server routes (run on CF Workers)
│   ├── api/
│   │   ├── scores/
│   │   │   ├── index.get.ts       # GET  /api/scores  — leaderboard
│   │   │   └── index.post.ts      # POST /api/scores  — submit score
│   │   └── auth/
│   │       ├── google.get.ts      # OAuth redirect
│   │       └── google.callback.get.ts
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema definition (users, scores)
│   │   └── index.ts               # Drizzle client + typed query helpers
│   └── middleware/
│       └── session.ts             # Validate JWT session cookie
│
├── migrations/                    # Auto-generated Drizzle migrations (git-tracked)
│   └── 0001_initial_schema.sql
│
├── nuxt.config.ts                 # nitro.preset = 'cloudflare-module'
├── drizzle.config.ts              # Drizzle CLI config (schema path, driver)
├── wrangler.toml                  # CF Workers config, D1 binding declaration
└── README.md
```

---

## Database Schema (Drizzle ORM)

Define tables in `server/db/schema.ts` using Drizzle:

```typescript
import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Google sub claim
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const scores = sqliteTable(
  'scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').references(() => users.id), // NULL for guest scores
    score: integer('score').notNull(),
    level: integer('level').notNull(),
    ruleSet: text('rule_set').notNull(), // e.g. "multiples", "primes"
    playedAt: integer('played_at', { mode: 'timestamp' }).notNull(),
  },
  table => ({
    scoreIdx: index('idx_scores_score').on(table.score),
  }),
)
```

**Migration workflow:**
1. Modify `server/db/schema.ts` as needed
2. Generate migrations: `npx drizzle-kit generate:sqlite`
3. Apply locally: `wrangler d1 migrations apply DB --local`
4. On deployment, migrations auto-apply to production D1

**Database access** (in server routes):

```typescript
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '~/server/db/schema'

export default defineEventHandler(async event => {
  const db = drizzle(event.context.cloudflare.env.DB, { schema })
  
  // Type-safe queries
  const user = await db.select().from(schema.users).where(
    eq(schema.users.id, googleId)
  )
  
  await db.insert(schema.scores).values({
    userId: userId,
    score: 1200,
    level: 5,
    ruleSet: 'multiples',
    playedAt: new Date(),
  })
})
```

---

## Getting Started (WIP)

> Setup instructions will be added as the project is scaffolded.

**Prerequisites:** Node.js 20+, [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/), a Cloudflare account.

```bash
# Install dependencies
npm install

# Build WASM engine (AssemblyScript → .wasm)
npm run engine:build

# Start local dev server (Nuxt + Nitro with Wrangler D1 local)
npm run dev

# Run D1 migrations locally
wrangler d1 migrations apply DB --local

# Deploy to Cloudflare Workers
npm run deploy
# equivalent to: nuxi build && wrangler deploy
```

**Environment variables** (set in `.env` for local dev, CF secrets for production):

```
NUXT_OAUTH_GOOGLE_CLIENT_ID=...
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=...
NUXT_SESSION_SECRET=...   # 32+ char random string for cookie signing
```

---

## Design Principles

1. **WASM-first** — game logic lives entirely in the WASM module. The JS/TS host is a thin shell.
2. **60 FPS baseline** — rendering and input handling are optimized to never drop frames during normal gameplay.
3. **Mobile is first-class** — touch targets, layout, and performance are tested on mobile from day one, not bolted on later.
4. **Auth is optional** — the full game is playable as a guest; sign-in only unlocks score saving and leaderboard.

---

## Development

### Code Style

**ESLint + Stylistic** — enforced via `eslint.config.mjs`, auto-fixed on save in VSCode.

| Rule | Setting | Why |
|---|---|---|
| Indent | 2 spaces | Nuxt standard; readable on mobile |
| Quotes | Single (`'`) | Modern JavaScript convention |
| Semicolons | None | Clean, modern feel (ASI safe in our patterns) |
| Trailing commas | Always multiline | Cleaner diffs, easier cherry-picks |
| Brace style | 1TBS | Standard control flow style |

**Vue component structure** (strict ordering in `<script setup lang="ts">` SFC):

```vue
<script setup lang="ts">
import type { MyType } from '@/types'
import { ref } from 'vue'
import MyComponent from '@/components/MyComponent.vue'

interface Props {
  title: string
}

defineProps<Props>()
const emit = defineEmits<{ update: [value: string] }>()

const count = ref(0)
const handleClick = () => { count.value++ }
</script>

<template>
  <MyComponent :title="title" @update="emit('update', $event)">
    <button @click="handleClick">Count: {{ count }}</button>
  </MyComponent>
</template>

<style scoped>
button {
  @apply px-4 py-2 rounded bg-primary text-primary-foreground;
}
</style>
```

**Key Vue conventions:**
- `<script setup lang="ts">` at the top (imports, types, reactive state, handlers)
- `<template>` in the middle (clean markup, minimal logic)
- `<style scoped>` at the bottom (Tailwind + custom rules)
- Type imports use `import type { ... }`
- Component names in PascalCase (enforced in templates by ESLint)
- Props/emits declared with `defineProps<T>()` / `defineEmits<T>()`

### VSCode Setup

**.vscode/settings.json** auto-fixes ESLint errors on save:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

**Required extension:** [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)  
(Workspace recommends it automatically via `.vscode/extensions.json`.)

### Running ESLint Locally

```bash
# Check for violations
npm run lint

# Auto-fix everything
npm run lint:fix
```

---
