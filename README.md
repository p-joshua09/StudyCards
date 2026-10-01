# StudyCards

StudyCards is a modular flashcard and study app built with Next.js, TypeScript, and Supabase.

## Run locally

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

The app opens in demo mode until Supabase is configured.

## Enable accounts and database access

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL` in `.env.local`.
4. Apply the SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor or through the Supabase CLI. The second migration creates the private `source-files` bucket; your project's global storage upload limit must also allow 10 MiB files.
5. In Supabase Auth, allow email and password sign-in and add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
6. Restart the development server.

The migration creates owner-scoped tables for profiles, source material, decks, cards, AI generation jobs, review scheduling and history, and quiz sessions. It enables row-level security, removes the default client grants, and grants only the operations each feature needs.

## Source materials

The Library accepts pasted notes and PDF, DOCX, or TXT files (up to 10 MiB each). File text is extracted on the server. Scanned/image-only PDFs are not supported yet. Sources can be searched, opened, renamed, and archived. When Supabase is configured, the original file is kept in a private storage bucket and the extracted text and metadata are saved in the owner-scoped database table.

Without Supabase, sources are saved only in this browser for prototyping. Uploaded files are parsed for text, but the original file bytes are not kept in demo mode. Clearing browser storage removes demo sources. This is not a backup or a sync feature.

Do not put Supabase secret or service-role keys in `NEXT_PUBLIC_*` variables. This app uses the publishable key with the signed-in user's cookie session.

## AI flashcard generation

Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env.local`, then restart the app. `GEMINI_MODEL` defaults to `gemini-3.5-flash`; you can change it to a model available to your project. The key stays on the server and must never use a `NEXT_PUBLIC_*` name. Google currently lists Gemini 3.5 Flash in the [free tier](https://ai.google.dev/gemini-api/docs/pricing), subject to your project's rate limits and terms.

Open a saved source, choose **Generate flashcards**, then review and edit every draft before saving it as a deck. Generation uses at most the first 30,000 characters of a source and creates 5–20 cards. Signed-in accounts have a testing limit of 20 generation requests per rolling 24 hours. Apply the generation-quota migration before calling Gemini; it enforces that limit inside the database.

To test Gemini without Supabase, also set `LOCAL_DEMO_AI=true` in `.env.local` and run `npm run dev`. The development server binds to `127.0.0.1` by default. Never expose this unauthenticated demo mode on a LAN or tunnel. Production generation requires an account. Without a Gemini key, the review screen explains setup but does not invent AI results.

Source text is sent to Gemini when you press Generate. Review Google's [Gemini API pricing and data-use terms](https://ai.google.dev/gemini-api/docs/pricing) before sending sensitive study material. AI-generated cards may be wrong; check them against the source before saving.

`AI_PROVIDER=deepseek` remains reserved for a future adapter. The planned DeepSeek change should implement the same `StudyAIProvider` contract in `src/server/ai/` without changing the review UI.
