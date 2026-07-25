import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { findEpisode } from "./mock-data";

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

export const askEpisode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const found = findEpisode(data.episodeId);
    if (!found) throw new Error("Episode not found");
    const { podcast, episode } = found;

    const context = [
      `Podcast: ${podcast.title} — host ${podcast.host}`,
      `Episode ${episode.epNumber}: ${episode.title} (${episode.duration}, ${episode.date})`,
      ``,
      `Summary: ${episode.summary}`,
      ``,
      `Key Q&A from the transcript:`,
      ...episode.questions.map((q) => `- Q: ${q.q}\n  A: ${q.a}`),
      ``,
      `Books mentioned:`,
      ...(episode.books.length
        ? episode.books.map((b) => `- ${b.title} — ${b.author}`)
        : ["- (none)"]),
      ``,
      `Recipes shared:`,
      ...(episode.recipes.length
        ? episode.recipes.map((r) => `- ${r.title}: ${r.note}`)
        : ["- (none)"]),
      ``,
      `Other notes:`,
      ...(episode.misc.length
        ? episode.misc.map((m) => `- ${m.title}: ${m.note}`)
        : ["- (none)"]),
    ].join("\n");

    const system = `You are Lume, a friendly AI assistant that answers questions about a specific podcast episode the user is listening to. Only use the episode context below to answer. If a detail is not in the context, say so briefly and suggest what related info is available. Keep answers concise, warm, and formatted in short markdown (bold titles, bullet lists when listing recipes/books/practices).\n\nEPISODE CONTEXT:\n${context}`;

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.6-flash");

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
        throw new Error("AI credits are exhausted. Add credits in Lovable settings to continue.");
      }
      throw new Error(message);
    }
  });
