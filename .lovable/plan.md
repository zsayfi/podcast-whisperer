# Move Lume to a real database

Single-user app, no sign-in. Everything the app currently keeps in `mock-data.ts` or `localStorage` moves to Lovable Cloud so it survives across devices and browsers.

## Security note (important)

Because there is no login, every table will be readable and writable by anyone who has the app's public URL. That's fine for a personal app you don't share, but if you ever hand the URL to someone else they can see and edit everything. If you later want it private, we add sign-in and switch policies to `auth.uid()`-scoped in one follow-up.

## What moves to the database

- **Podcasts + episodes** — the catalog leaves `src/lib/mock-data.ts` and lives in DB tables, seeded with the current 5 shows.
- **Chat threads per episode** — every AI Q&A pair is stored per episode.
- **Saved insights (bookmarks)** — the answers you save from chat, with their tags. Custom tags live here too.
- **Favourite podcasts** — the shows shown in the Saved carousel.
- **Recently visited episodes** — replaces the current `localStorage` visit log so "latest episode you checked" works across devices.

## Tables

```text
podcasts          id, title, host, cover_key, episode_count, category, created_at
episodes          id, podcast_id, title, duration, date_label, ep_number,
                  summary, questions(jsonb), recipes(jsonb), books(jsonb), misc(jsonb)
chat_messages     id, episode_id, role, content, created_at
saved_insights    id, episode_id, message_id, question, answer, tags(text[]), created_at
saved_tags        tag (pk)                      -- custom tags you create
favourite_podcasts podcast_id (pk), created_at
episode_visits    episode_id (pk), visited_at
```

`cover_key` is a short string (e.g. `"wellness"`) that maps client-side to the bundled cover image asset, so we don't have to move image files into storage.

## Wiring

- **Data access** — TanStack Query + `createServerFn` for reads/writes. Loaders `ensureQueryData`, components use `useSuspenseQuery`, mutations invalidate their keys.
- **Home** (`/`) — Recent podcasts come from `episode_visits ⨝ episodes`. New episodes list comes from `episodes` filtered by podcast category.
- **Library** (`/library`, `/library/shows`, `/library/show/$id`, `/library/categories`) — read from `podcasts` and `episodes`.
- **Saved** (`/saved`, `/saved/show/$id`) — Favourite podcasts carousel from `favourite_podcasts`, latest episode from `episode_visits`, Saved-by-Lume list from `saved_insights` (filter chips still driven by tags), and custom tags from `saved_tags`. Adds a heart toggle on show screens to add/remove favourites.
- **Episode chat** (`/episode/$id`) — Messages loaded from `chat_messages` for that episode; sending a message and receiving the AI reply both insert rows. `recordEpisodeVisit` upserts into `episode_visits`. Save-answer button inserts/deletes in `saved_insights`.
- **Scan podcast** form on Home — for now still simulates scanning, but on success inserts a placeholder podcast + episode row so the flow is wired end-to-end (real transcription is a later step).

## Migration + seeding

One migration creates the tables, RLS (permissive: `USING (true) WITH CHECK (true)` for anon + authenticated), and inserts the current 5 podcasts and their episodes so the app looks identical on first load.

## Cleanup

- Delete `src/lib/chat-store.ts` (localStorage helpers) — replaced by server fns.
- `src/lib/mock-data.ts` shrinks to just the cover-image map + shared TS types.
- `mockAnswer` is already gone (chat uses the AI gateway) — no change there.

## Steps

1. Enable Lovable Cloud.
2. Run the schema migration (tables + RLS + seed data).
3. Add `src/lib/*.functions.ts` server functions for podcasts, episodes, chat, insights, favourites, visits.
4. Rewrite each route to fetch through TanStack Query instead of importing arrays / reading localStorage.
5. Remove `chat-store.ts` and trim `mock-data.ts`.
6. Smoke test each screen in the preview.
