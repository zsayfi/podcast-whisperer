import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, Calendar, Play, Send, Bookmark } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/app-shell";
import { findEpisode } from "@/lib/mock-data";
import {
  loadMessages,
  saveMessages,
  mockAnswer,
  loadSavedInsights,
  saveInsight,
  removeSavedInsight,
  recordEpisodeVisit,
  type ChatMessage,
} from "@/lib/chat-store";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/episode/$episodeId")({
  loader: ({ params }) => {
    const found = findEpisode(params.episodeId);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Episode not found \u2014 Lume" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { podcast, episode } = loaderData;
    const title = `${episode.title} \u2014 ${podcast.title}`;
    const desc = episode.summary;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: EpisodePage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-16 text-center">
        <p className="font-serif text-2xl text-primary">Episode not found</p>
        <Link to="/library" className="mt-3 inline-block text-sm text-gold underline">
          Back to library
        </Link>
      </div>
    </AppShell>
  ),
});

const suggestions = [
  "Which books were mentioned?",
  "Any recipes shared?",
  "What mindfulness practices were advised?",
  "Give me a short summary",
];

function EpisodePage() {
  const { podcast, episode } = Route.useLoaderData();

  const initial = useMemo<ChatMessage[]>(
    () => [
      {
        id: "seed",
        role: "assistant",
        content: `Hi! I've listened to **${episode.title}**. Ask me anything — recipes, books, key ideas, or specific moments.`,
        createdAt: Date.now(),
      },
    ],
    [episode.id, episode.title],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/library" });
    }
  };

  // Load per-episode thread on mount / episode change
  useEffect(() => {
    const saved = loadMessages(episode.id);
    setMessages(saved.length ? saved : initial);
    setSavedIds(new Set(loadSavedInsights().map((i) => i.id)));
    recordEpisodeVisit(episode.id);
  }, [episode.id, initial]);

  useEffect(() => {
    saveMessages(episode.id, messages);
  }, [episode.id, messages]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [episode.id]);

  const toggleSave = (assistantMsg: ChatMessage) => {
    if (assistantMsg.id === "seed") return;
    const idx = messages.findIndex((m) => m.id === assistantMsg.id);
    const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    const question = prevUser?.content ?? "Chat insight";
    const next = new Set(savedIds);
    if (savedIds.has(assistantMsg.id)) {
      removeSavedInsight(assistantMsg.id);
      next.delete(assistantMsg.id);
    } else {
      saveInsight({
        id: assistantMsg.id,
        episodeId: episode.id,
        episodeTitle: episode.title,
        podcastTitle: podcast.title,
        question,
        answer: assistantMsg.content,
        savedAt: Date.now(),
      });
      next.add(assistantMsg.id);
    }
    setSavedIds(next);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: mockAnswer(episode, text),
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, reply]);
      setThinking(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }, 700);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-4 pt-6 sm:px-6 lg:max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/library"
            className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-gold">
              {podcast.title}
            </p>
            <p className="truncate text-sm font-semibold text-primary">Ep. {episode.epNumber}</p>
          </div>
        </div>

        <section className="mb-4 flex overflow-hidden rounded-3xl shadow-sm">
          <img
            src={podcast.cover}
            alt={podcast.title}
            loading="lazy"
            width={800}
            height={800}
            className="h-32 w-28 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1 bg-primary p-4 text-primary-foreground">
            <p className="font-serif text-base font-bold leading-snug sm:text-lg">
              {episode.title}
            </p>
            <p className="mt-2 flex items-center gap-3 text-xs text-primary-foreground/80">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{episode.duration}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{episode.date}</span>
            </p>
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground">
              <Play className="h-3 w-3 fill-current" /> Play episode
            </button>
          </div>
        </section>

        <div
          ref={scrollerRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-3xl bg-card/40 p-4 sm:p-5"
        >
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              saved={savedIds.has(m.id)}
              canSave={m.role === "assistant" && m.id !== "seed"}
              onToggleSave={() => toggleSave(m)}
            />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:300ms]" />
              </span>
              Thinking...
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex items-end gap-2 rounded-3xl bg-card p-2 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about this episode..."
            className="min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
              input.trim() && !thinking
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </main>
    </div>
  );
}

function MessageBubble({
  message,
  saved,
  canSave,
  onToggleSave,
}: {
  message: ChatMessage;
  saved?: boolean;
  canSave?: boolean;
  onToggleSave?: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-base",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground",
        )}
      >
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-strong:font-semibold [&_strong]:text-inherit">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {canSave && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={onToggleSave}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                saved
                  ? "bg-gold/20 text-gold"
                  : "bg-primary/5 text-primary hover:bg-primary/10",
              )}
              aria-label={saved ? "Remove from saved" : "Save answer"}
            >
              <Bookmark className={cn("h-3 w-3", saved && "fill-current")} />
              {saved ? "Saved" : "Save answer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

