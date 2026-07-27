import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireOpenAiApiKey } from "./ai-gateway.server";

const Input = z.object({
  url: z.string().url().max(2000),
});

const TranscriptInput = z.object({
  transcript: z.string().min(50).max(500_000),
  title: z.string().max(300).optional(),
  podcastId: z.string().max(200).optional(),
  podcastName: z.string().max(200).optional(),
  episodeName: z.string().max(300).optional(),
  appleUrl: z.string().url().max(2000).optional(),
});

function parseAppleId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/podcasts\.apple\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/\/id(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function resolveAppleArtwork(appleUrl: string): Promise<string | null> {
  const id = parseAppleId(appleUrl);
  if (!id) return null;
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: Array<{ artworkUrl600?: string; artworkUrl100?: string }>;
    };
    const r = json.results?.[0];
    return r?.artworkUrl600 || r?.artworkUrl100 || null;
  } catch {
    return null;
  }
}

function serverSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase server env is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const importEpisode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const openAiKey = requireOpenAiApiKey();

    const { resolveEpisode, downloadAudio, transcribeAudio, analyzeTranscript, slugify } =
      await import("./import.server");

    const sb = serverSupabase();

    // De-dupe: if we already imported this source URL, return it.
    {
      const { data: existing } = await sb
        .from("episodes")
        .select("id, transcript_status")
        .eq("source_url", data.url)
        .maybeSingle();
      if (existing?.id && existing.transcript_status === "ready") {
        return { episodeId: existing.id, reused: true };
      }
    }

    // 1. Resolve the audio URL + metadata.
    const resolved = await resolveEpisode(data.url);

    // 2. Upsert podcast row.
    const podcastId = slugify(resolved.rssUrl ?? resolved.podcastTitle ?? "podcast");
    const coverKey = ["wellness", "normal", "nutrition", "studio", "kitchen"][
      Math.abs(hashCode(podcastId)) % 5
    ];
    {
      const { error } = await sb.from("podcasts").upsert(
        {
          id: podcastId,
          title: resolved.podcastTitle || "Podcast",
          host: resolved.podcastHost || "",
          cover_key: coverKey,
          category: "HEALTH",
          rss_url: resolved.rssUrl ?? null,
          website_url: resolved.websiteUrl ?? null,
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(`Podcast upsert failed: ${error.message}`);
    }

    // 3. Create episode shell (status: transcribing).
    const episodeId = `${podcastId}-${slugify(resolved.title, "ep")}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    {
      const { count } = await sb
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("podcast_id", podcastId);
      const epNumber = (count ?? 0) + 1;
      const { error } = await sb.from("episodes").insert({
        id: episodeId,
        podcast_id: podcastId,
        title: resolved.title,
        duration: resolved.durationLabel ?? "",
        date_label: resolved.dateLabel ?? new Date().toLocaleDateString(),
        ep_number: epNumber,
        summary: "",
        source_url: data.url,
        audio_url: resolved.audioUrl,
        transcript: "",
        transcript_status: "transcribing",
        imported_at: nowIso,
      });
      if (error) throw new Error(`Episode insert failed: ${error.message}`);
    }

    async function markError(msg: string): Promise<never> {
      await sb
        .from("episodes")
        .update({ transcript_status: "error", transcript_error: msg })
        .eq("id", episodeId);
      throw new Error(msg);
    }

    // 4. Download + transcribe.
    let transcript = "";
    try {
      const audio = await downloadAudio(resolved.audioUrl);
      transcript = await transcribeAudio(audio, resolved.audioUrl, openAiKey);
    } catch (err) {
      await markError(err instanceof Error ? err.message : String(err));
    }

    await sb
      .from("episodes")
      .update({ transcript, transcript_status: "analyzing" })
      .eq("id", episodeId);

    // 5. Analyze.
    let analysis;
    try {
      analysis = await analyzeTranscript(transcript, resolved.title, openAiKey);
    } catch (err) {
      await markError(err instanceof Error ? err.message : String(err));
    }
    if (!analysis) return { episodeId };

    // 6. Persist analysis + mark ready.
    {
      const { error } = await sb
        .from("episodes")
        .update({
          summary: analysis.summary,
          questions: analysis.questions,
          books: analysis.books,
          recipes: analysis.recipes,
          misc: analysis.misc,
          transcript_status: "ready",
        })
        .eq("id", episodeId);
      if (error) throw new Error(`Episode finalize failed: ${error.message}`);

      await sb
        .from("podcasts")
        .update({ category: analysis.suggestedCategory })
        .eq("id", podcastId)
        .eq("category", "HEALTH");
    }

    return { episodeId, reused: false };
  });

export const importTranscript = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranscriptInput.parse(input))
  .handler(async ({ data }) => {
    const openAiKey = requireOpenAiApiKey();

    const { analyzeTranscript, slugify } = await import("./import.server");
    const sb = serverSupabase();

    const transcript = data.transcript.trim();
    const providedTitle = (data.episodeName ?? data.title)?.trim();
    const providedPodcastName = data.podcastName?.trim();

    // Analyze first so we can derive a useful title/category.
    const analysis = await analyzeTranscript(
      transcript,
      providedTitle || "Pasted transcript",
      openAiKey,
    );

    const derivedTitle =
      providedTitle ||
      (analysis.summary ? analysis.summary.split(/[.!?]/)[0].slice(0, 100).trim() : "") ||
      `Transcript ${new Date().toLocaleDateString()}`;

    const podcastTitle = providedPodcastName || "Pasted transcripts";
    const normalizedTitle = podcastTitle.trim().replace(/\s+/g, " ");
    const normalizedKey = normalizedTitle.toLocaleLowerCase();

    let podcastId: string | null = null;

    if (data.podcastId) {
      // Exact selection from the UI dropdown — trust it if it exists.
      const { data: existing } = await sb
        .from("podcasts")
        .select("id")
        .eq("id", data.podcastId)
        .maybeSingle();
      if (existing?.id) podcastId = existing.id;
    }

    if (!podcastId && providedPodcastName) {
      // Forgiving match against existing shows by normalized title.
      const { data: existingShows } = await sb.from("podcasts").select("id, title");
      const match = (existingShows ?? []).find(
        (r: { id: string; title: string }) =>
          r.title.trim().replace(/\s+/g, " ").toLocaleLowerCase() === normalizedKey,
      );
      if (match) podcastId = match.id;
    } else if (!podcastId && !providedPodcastName) {
      podcastId = "pasted-transcripts";
    }

    if (!podcastId) {
      // Create a new show. Slug may be empty for non-Latin names — fall back
      // to a stable unique id in that case.
      const baseSlug = slugify(normalizedTitle, "");
      let candidate = baseSlug || `podcast-${Date.now().toString(36)}`;
      // Ensure uniqueness (avoid merging unrelated shows on slug collision).
      for (let i = 0; i < 5; i++) {
        const { data: clash } = await sb
          .from("podcasts")
          .select("id, title")
          .eq("id", candidate)
          .maybeSingle();
        if (!clash) break;
        const clashTitle = (clash as { title: string }).title
          .trim()
          .replace(/\s+/g, " ")
          .toLocaleLowerCase();
        if (clashTitle === normalizedKey) break; // safety: same title, reuse
        candidate = `${baseSlug || "podcast"}-${Math.random().toString(36).slice(2, 7)}`;
      }
      podcastId = candidate;

      const { error } = await sb.from("podcasts").insert({
        id: podcastId,
        title: normalizedTitle,
        host: "",
        cover_key: "studio",
        category: analysis.suggestedCategory,
      });
      if (error) throw new Error(`Podcast insert failed: ${error.message}`);
    } else if (!providedPodcastName && !data.podcastId) {
      // Ensure the pasted-transcripts bucket exists.
      const { error } = await sb.from("podcasts").upsert(
        {
          id: podcastId,
          title: podcastTitle,
          host: "",
          cover_key: "studio",
          category: analysis.suggestedCategory,
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(`Podcast upsert failed: ${error.message}`);
    }

    const episodeId = `${podcastId}-${slugify(derivedTitle, "ep")}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const { count } = await sb
      .from("episodes")
      .select("id", { count: "exact", head: true })
      .eq("podcast_id", podcastId);
    const epNumber = (count ?? 0) + 1;

    const { error } = await sb.from("episodes").insert({
      id: episodeId,
      podcast_id: podcastId,
      title: derivedTitle,
      duration: "",
      date_label: new Date().toLocaleDateString(),
      ep_number: epNumber,
      summary: analysis.summary,
      questions: analysis.questions,
      books: analysis.books,
      recipes: analysis.recipes,
      misc: analysis.misc,
      transcript,
      transcript_status: "ready",
      imported_at: nowIso,
    });
    if (error) throw new Error(`Episode insert failed: ${error.message}`);

    // Refresh episode_count on the podcast so Library → Shows is accurate.
    await sb.from("podcasts").update({ episode_count: epNumber }).eq("id", podcastId);

    // Optional Apple Podcasts artwork — refresh cover for new or existing show.
    if (data.appleUrl) {
      const artwork = await resolveAppleArtwork(data.appleUrl);
      const patch: { apple_url: string; cover_url?: string } = {
        apple_url: data.appleUrl,
      };
      if (artwork) patch.cover_url = artwork;
      await sb.from("podcasts").update(patch).eq("id", podcastId);
    }

    return { episodeId };
  });

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
