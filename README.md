# GATE Prep Hub

A single place for GATE 2027 prep — lectures, previous year questions, mock tests, progress tracking, and an AI doubt-solving chatbot. Built this because my friend was juggling a Telegram course, a separate PYQ source, and mock tests from yet another site, and it made more sense to pull it all into one dashboard.

Stack: Next.js (App Router), TypeScript, Tailwind, Supabase for auth/database, Groq for AI features.

## What's built so far

**Auth & dashboard** — sign up, log in, land on a home screen linking to Lectures, PYQ Bank, Mock Tests, and the Doubt Chatbot.

**Lecture Hub** — organized by subject (custom subjects can be added on the fly). Add a single YouTube video or import a whole playlist at once (pulls real titles automatically). Google Drive and other links are supported too. Watch progress on YouTube videos tracks automatically; other sources use a manual "mark as watched" toggle. Each lecture can generate an AI summary and a 5-question quiz from its captions (or from pasted notes if the video has no captions). Bulk select-and-delete for cleaning up a playlist import.

**PYQ Bank** — questions organized by subject, filtered to the signed-in user's branch (CS, DA, etc.). Three ways to add questions:
- **Upload PDF** — the star feature. Upload an official GATE paper (or any PDF with practice questions) and AI extracts questions, options, and answers where determinable. Processes the whole document automatically in chunks (to respect Groq's free-tier rate limits) with a review screen before anything is saved — every field is editable and any question can be unchecked.
- **Single question** — manual entry, MCQ or numerical-answer.
- **JSON import** — paste a structured array for bulk adds from your own source material.

Answering a question gives instant feedback plus an AI-generated explanation (cached after first generation, and written in plain English — no LaTeX/markdown clutter). Every attempt updates topic-level accuracy in the background, which will feed the weak-topic recommendations later. Questions can be edited or deleted after the fact (useful since papers without an official answer key mean AI-guessed answers occasionally need correcting).

**Not built yet** — Mock Tests, Daily Planner & Streaks, Progress Analytics dashboard, the doubt chatbot.

## Getting it running

**1. Install dependencies**

```bash
npm install
```

**2. Set up Supabase**

Create a free project at supabase.com. Grab the Project URL and anon key from Project Settings → API. Then, in the SQL Editor, run these files **in order**:

1. `supabase/schema.sql` — core tables
2. `supabase/seed.sql` — GATE CS/DA subjects and topics
3. `supabase/phase2-policies.sql` — lets you add lectures
4. `supabase/phase2b-lecture-subjects.sql` — lecture subject support
5. `supabase/phase2c-custom-subjects-and-ai.sql` — custom subjects + AI content caching
6. `supabase/phase3-pyq-policies.sql` — lets you add/edit/delete PYQs

**3. Get free API keys**

- **Groq** (console.groq.com/keys) — powers all the AI features (summaries, quizzes, explanations, PDF extraction). Free, no card needed.
- **YouTube Data API v3** (console.cloud.google.com) — powers playlist import. Free quota, no billing required for this usage level.

**4. Environment variables**

```bash
cp .env.local.example .env.local
```

Fill in Supabase URL/key, Groq key, and YouTube API key.

**5. Run it**

```bash
npm run dev
```

Go to localhost:3000, sign up, and you're in.

## Pushing to GitHub / deploying

```bash
git init
git add .
git commit -m "your message"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/gate-prep-hub.git
git push -u origin main
```

For deployment, import the repo into Vercel (free tier), add the same env variables under Settings → Environment Variables. Note: PDF extraction and playlist import can take a while for large inputs (rate-limit pacing on the free AI tier) — Vercel's free tier caps a single request at 60 seconds, which the PDF importer works around by processing one chunk per request and looping from the browser.

## Folder layout

```
src/app/login              auth page
src/app/dashboard          home screen after login
src/app/lectures           lecture hub, add/[id] pages
src/app/pyqs               PYQ bank: subject list, question list, attempt page, edit, add
src/app/mock-tests         (coming soon)
src/app/chatbot            (coming soon)
src/app/api/
  import-playlist          fetches all videos in a YouTube playlist
  lecture-ai               generates lecture summary + quiz from captions/notes
  parse-pyq-pdf            extracts PYQs from an uploaded PDF, one chunk per call
  pyq-explain              generates a plain-English explanation for a PYQ
src/lib/supabase           Supabase client setup (browser + server)
src/lib/youtube.ts         YouTube URL/playlist parsing helpers
src/proxy.ts               keeps auth sessions refreshed
supabase/                  schema + migrations, run once each in Supabase
```