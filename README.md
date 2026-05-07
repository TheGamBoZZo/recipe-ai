# Mise — AI Recipe & Meal Planner

A full-stack Next.js app where users enter ingredients and Claude generates complete recipes. Save recipes, build a weekly meal plan, and auto-generate a smart grocery list.

**Tech stack:** Next.js 15 · Prisma · PostgreSQL · NextAuth.js · Claude API · Tailwind CSS v4

---

## Setup (3 steps)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in each value:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Railway.app](https://railway.app) → New Project → PostgreSQL → copy connection string |
| `AUTH_SECRET` | Run `openssl rand -base64 32` in your terminal |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client. Redirect URI: `http://localhost:3000/api/auth/callback/google` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | [github.com/settings/apps](https://github.com/settings/apps) → New OAuth App. Callback URL: `http://localhost:3000/api/auth/callback/github` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

### 3. Push the database schema and run

```bash
npm run db:push       # creates all tables in your PostgreSQL db
npm run db:generate   # generates Prisma client
npm run dev           # starts at http://localhost:3000
```

---

## Features

- **AI Recipe Generation** — Enter any ingredients. Claude streams back a full recipe with ingredients, method, prep/cook times, and difficulty rating.
- **Recipe Library** — Save generated recipes to your personal collection.
- **Weekly Meal Planner** — Assign saved recipes to breakfast/lunch/dinner slots across a week. Navigate between weeks.
- **Smart Grocery List** — Click one button and Claude consolidates all ingredients from your meal plan into a categorised, deduplicated shopping list. Check items off as you shop.
- **OAuth Authentication** — Sign in with Google or GitHub. All data is per-user.

---

## Project structure

```
app/
  page.tsx                  → Landing page
  layout.tsx                → Root layout with nav
  globals.css               → Design system (custom properties, base styles)
  recipes/page.tsx          → Generate + saved recipes
  planner/page.tsx          → Weekly meal planner grid
  grocery/page.tsx          → Grocery list generator
  api/
    auth/[...nextauth]/     → NextAuth handler
    generate-recipe/        → Streaming Claude recipe generation
    recipes/                → CRUD for saved recipes
    meal-plan/              → Meal plan read/write
    grocery-list/           → AI grocery list consolidation
components/
  Nav.tsx                   → Top navigation
lib/
  auth.ts                   → NextAuth config
  prisma.ts                 → Prisma client singleton
prisma/
  schema.prisma             → DB schema (User, Recipe, MealPlan, MealSlot)
```

---

## Deploy to Vercel + Railway

1. Push your code to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Change `NEXTAUTH_URL` to your production Vercel URL
5. Update OAuth redirect URIs to your production URL
6. Deploy — Vercel auto-detects Next.js

