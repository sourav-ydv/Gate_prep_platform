# GATE Prep Hub

A single place for GATE 2027 prep — lectures, previous year questions, mock tests, progress tracking, and an AI doubt-solving chatbot. Built this because my friend was juggling a Telegram course, a separate PYQ source, and mock tests from yet another site, and it made more sense to pull it all into one dashboard.

Stack: Next.js (App Router), TypeScript, Tailwind, Supabase for auth/database, Groq for the AI chatbot.

## What's built so far

Auth and a dashboard shell are working — you can sign up, log in, and land on a home screen with cards for Lectures, PYQ Bank, Mock Tests, and the Doubt Chatbot. The database schema is fully set up in Supabase (with row-level security so every user's data stays private to them). The actual Lectures/PYQ/Mock Test/Chatbot pages are still placeholders — building those next.

## Getting it running

**1. Install dependencies**

```bash
npm install
```

**2. Set up Supabase**

Create a free project at supabase.com. Grab the Project URL and anon key from Project Settings → API. Then open the SQL Editor, paste in everything from `supabase/schema.sql`, and run it — this creates all the tables.

**3. Get a Groq key**

Free, no card needed: console.groq.com/keys. Not used yet, but the chatbot phase will need it.

**4. Environment variables**

```bash
cp .env.local.example .env.local
```

Fill in the Supabase URL/key (and Groq key later).

**5. Run it**

```bash
npm run dev
```

Go to localhost:3000, sign up with any email/password, you should land on the dashboard.

## Pushing to GitHub / deploying

```bash
git init
git add .
git commit -m "auth + dashboard + db schema"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/gate-prep-hub.git
git push -u origin main
```

For deployment, import the repo into Vercel (free tier), add the same env variables there under Settings → Environment Variables, and it deploys automatically on every push.

## Folder layout

```
src/app/login          auth page
src/app/dashboard      home screen after login
src/app/lectures       lecture hub (coming next)
src/app/pyqs           PYQ bank (coming soon)
src/app/mock-tests     mock test engine (coming soon)
src/app/chatbot        AI doubt chatbot (coming soon)
src/lib/supabase       Supabase client setup (browser + server)
src/proxy.ts           keeps auth sessions refreshed
supabase/schema.sql    full database schema, run once in Supabase