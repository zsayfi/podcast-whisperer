import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createOpenAiProvider, DEFAULT_TEXT_MODEL, requireOpenAiApiKey } from "./ai-gateway.server";

const Input = z.object({
  question: z.string().min(1).max(2000),
});

type LibraryEpisodeRow = {
  id: string;
  title: string;
  ep_number?: number;
  summary?: string;
  transcript?: string | null;
  transcript_status?: string;
  podcasts?: { title?: string | null; host?: string | null } | null;
};

export const askLibrary = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = requireOpenAiApiKey();

    const url = process.env.SUPABASE_URL;
    const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !pubKey) throw new Error("Supabase server env is not configured");

    const sb = createClient(url, pubKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (pubKey.startsWith("sb_") && h.get("Authorization") === `Bearer ${pubKey}`) {
            h.delete("Authorization");
          }
          h.set("apikey", pubKey);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: eps, error } = await sb
      .from("episodes")
      .select("id, title, ep_number, summary, transcript, transcript_status, podcasts(title, host)")
      .eq("transcript_status", "ready");
    if (error) throw new Error(error.message);

    const ready = ((eps ?? []) as LibraryEpisodeRow[]).filter(
      (e) => typeof e.transcript === "string" && e.transcript.trim().length > 100,
    );

    if (ready.length === 0) {
      return {
        answer:
          "No imported transcripts yet. Add a podcast episode transcript first, and I'll be able to search across your library.",
      };
    }

    // Budget total characters to keep prompt manageable
    const TOTAL_CAP = 120_000;
    const perEpCap = Math.max(2000, Math.floor(TOTAL_CAP / ready.length));

    const blocks = ready.map((e, idx: number) => {
      const p = e.podcasts ?? {};
      const t = e.transcript ?? "";
      const truncated = t.length > perEpCap ? t.slice(0, perEpCap) + "\n…[truncated]" : t;
      return `--- EPISODE ${idx + 1} ---\nPodcast: ${p.title ?? "(unknown)"}${p.host ? ` — host ${p.host}` : ""}\nEpisode ${e.ep_number}: ${e.title}\nSummary: ${e.summary || "(none)"}\nTranscript:\n${truncated}`;
    });

    const context = blocks.join("\n\n");

    const system = `You are Lume, an AI assistant that answers questions using ONLY the podcast episode transcripts provided below. Search across all episodes in the LIBRARY CONTEXT and answer from those transcripts.

RULES:
- Cite which podcast and episode you drew each answer from (e.g. "In *Podcast Title* — Ep. 3: Title, ...").
- If the answer is not contained in any transcript, say so briefly ("I couldn't find that in your library.") — do not invent.
- Keep answers concise, warm, and formatted in short markdown.

LANGUAGE: Search across ALL transcripts regardless of their language (English, Russian, German, mixed, etc.) — every transcript is a valid potential source. Detect the language of the USER'S QUESTION and reply in that same language, even when the source transcript is in a different language (e.g. English question + German transcript → answer in English; Russian question + English transcript → answer in Russian). Translate quoted content into the user's question language when needed, but keep podcast titles, episode titles, and host names in their original form when citing sources.

LIBRARY CONTEXT:
${context}`;

    const gateway = createOpenAiProvider(key);
    const model = gateway(DEFAULT_TEXT_MODEL);

    try {
      const { text } = await generateText({
        model,
        system,
        messages: [{ role: "user" as const, content: data.question }],
      });
      return { answer: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("429")) {
        throw new Error("Lume is getting a lot of questions right now — try again in a moment.");
      }
      if (message.includes("402")) {
        throw new Error("OpenAI credits are exhausted. Add credits in OpenAI billing to continue.");
      }
      throw new Error(message);
    }
  });
