import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createOpenAiProvider, DEFAULT_TEXT_MODEL, requireOpenAiApiKey } from "./ai-gateway.server";

const Input = z.object({
  episodeId: z.string().min(1),
  question: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
});

type QA = { q: string; a: string };
type Titled = { title: string; note?: string; author?: string };
type EpisodeContextRow = {
  title: string;
  ep_number?: number;
  duration?: string;
  date_label?: string;
  summary?: string;
  transcript?: string | null;
  questions?: QA[];
  books?: Titled[];
  recipes?: Titled[];
  misc?: Titled[];
  podcasts?: { title?: string | null; host?: string | null } | null;
};

export const askEpisode = createServerFn({ method: "POST" })
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

    const { data: ep, error } = await sb
      .from("episodes")
      .select("*, podcasts(title, host)")
      .eq("id", data.episodeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ep) throw new Error("Episode not found");

    const e = ep as EpisodeContextRow;
    const podcast = e.podcasts ?? {};
    const questions = (e.questions ?? []) as QA[];
    const books = (e.books ?? []) as Titled[];
    const recipes = (e.recipes ?? []) as Titled[];
    const misc = (e.misc ?? []) as Titled[];

    const transcript = typeof e.transcript === "string" ? e.transcript : "";
    const hasTranscript = transcript.trim().length > 200;

    const contextLines = [
      `Podcast: ${podcast.title} — host ${podcast.host}`,
      `Episode ${e.ep_number}: ${e.title} (${e.duration}, ${e.date_label})`,
      ``,
      `Summary: ${e.summary || "(not yet available)"}`,
    ];
    if (hasTranscript) {
      const cap = 100_000;
      const t = transcript.length > cap ? transcript.slice(0, cap) + "\n…[truncated]" : transcript;
      contextLines.push("", "Full transcript:", t);
    } else {
      contextLines.push(
        ``,
        `Key Q&A from the transcript:`,
        ...(questions.length ? questions.map((q) => `- Q: ${q.q}\n  A: ${q.a}`) : ["- (none)"]),
        ``,
        `Books mentioned:`,
        ...(books.length ? books.map((b) => `- ${b.title} — ${b.author}`) : ["- (none)"]),
        ``,
        `Recipes / practices shared:`,
        ...(recipes.length ? recipes.map((r) => `- ${r.title}: ${r.note}`) : ["- (none)"]),
        ``,
        `Other notes:`,
        ...(misc.length ? misc.map((m) => `- ${m.title}: ${m.note}`) : ["- (none)"]),
      );
    }
    const context = contextLines.join("\n");

    const system = `You are Lume, a friendly AI assistant that answers questions about a specific podcast episode the user is listening to. Only use the episode context below to answer. If a detail is not in the context, say so briefly and suggest what related info is available. Keep answers concise, warm, and formatted in short markdown (bold titles, bullet lists when listing recipes/books/practices).\n\nLANGUAGE: Detect the primary language of the EPISODE CONTEXT below and reply in that same language by default (e.g. Russian context → answer in Russian; German context → answer in German). Do not translate into English unless the user explicitly asks for translation or asks in a different language — in that case, follow the user's explicit language request.\n\nEPISODE CONTEXT:\n${context}`;

    const gateway = createOpenAiProvider(key);
    const model = gateway(DEFAULT_TEXT_MODEL);

    try {
      const { text } = await generateText({
        model,
        system,
        messages: [
          ...(data.history ?? []).map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: data.question },
        ],
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
