// LocalStorage-backed per-episode chat threads (mock, UI-first).
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const key = (episodeId: string) => `lume:chat:${episodeId}`;

export function loadMessages(episodeId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(episodeId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveMessages(episodeId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(episodeId), JSON.stringify(messages));
}

export function clearMessages(episodeId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(episodeId));
}

// Saved insights from AI chat
export type SavedInsight = {
  id: string;
  episodeId: string;
  episodeTitle: string;
  podcastTitle: string;
  question: string;
  answer: string;
  savedAt: number;
};

const SAVED_KEY = "lume:saved-insights";

export function loadSavedInsights(): SavedInsight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedInsight[]) : [];
  } catch {
    return [];
  }
}

export function saveInsight(insight: SavedInsight) {
  if (typeof window === "undefined") return;
  const all = loadSavedInsights();
  if (all.some((i) => i.id === insight.id)) return;
  window.localStorage.setItem(SAVED_KEY, JSON.stringify([insight, ...all]));
}

export function removeSavedInsight(id: string) {
  if (typeof window === "undefined") return;
  const all = loadSavedInsights().filter((i) => i.id !== id);
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(all));
}

export function isInsightSaved(id: string): boolean {
  return loadSavedInsights().some((i) => i.id === id);
}



// Mock AI answer using episode data
import type { Episode } from "./mock-data";

export function mockAnswer(episode: Episode, question: string): string {
  const q = question.toLowerCase().trim();

  const matched = episode.questions.find((entry) =>
    entry.q.toLowerCase().split(/\W+/).some((w) => w.length > 3 && q.includes(w)),
  );
  if (matched) return matched.a;

  if (q.includes("book")) {
    if (!episode.books.length) return "No books were mentioned in this episode.";
    return `Books mentioned:\n\n${episode.books.map((b) => `- **${b.title}** \u2014 ${b.author}`).join("\n")}`;
  }
  if (q.includes("recipe") || q.includes("cook") || q.includes("food")) {
    if (!episode.recipes.length) return "No recipes were shared in this episode.";
    return `Recipes shared:\n\n${episode.recipes.map((r) => `- **${r.title}** \u2014 ${r.note}`).join("\n")}`;
  }
  if (q.includes("mindful") || q.includes("meditat") || q.includes("practice")) {
    const mind = episode.questions.find((e) => e.a.toLowerCase().includes("breath") || e.a.toLowerCase().includes("mindful"));
    if (mind) return mind.a;
    return "No specific mindfulness practices were highlighted in this episode.";
  }
  if (q.includes("summary") || q.includes("about") || q.includes("summarise") || q.includes("summarize")) {
    return episode.summary;
  }

  return `Here is what stood out in **${episode.title}**:\n\n${episode.summary}\n\nTry asking about books, recipes, or the specific topics discussed.`;
}
