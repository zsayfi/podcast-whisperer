import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, Calendar, Play, Send, Bookmark, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/app-shell";
import {
  addMessage,
  getEpisode,
  listMessages,
  listSavedInsights,
  recordEpisodeVisit,
  saveInsight,
  unsaveInsightByMessage,
  type ChatMessage,
} from "@/lib/data";
import { askEpisode } from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/episode/$episodeId")({
  head: () => ({
    meta: [
      { title: "Episode \u2014 Lume" },
      { name: "description", content: "Chat with Lume about this episode." },
      { property: "og:title", content: "Episode \u2014 Lume" },
      { property: "og:description", content: "Chat with Lume about this episode." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EpisodePage,
});

const defaultSuggestions = [
  "Give me a short summary",
  "Which books were mentioned?",
  "Any recipes or practices shared?",
  "What are the key takeaways?",
];

function EpisodePage() {
  const { episodeId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: episodeData, isLoading } = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: () => getEpisode(episodeId),
    refetchInterval: (q) => {
      const status = q.state.data?.episode.transcriptStatus;
      return status === "transcribing" || status === "analyzing" || status === "importing"
        ? 3000
        : false;
    },
  });

  const { data: dbMessages = [] } = useQuery({
    queryKey: ["messages", episodeId],
    queryFn: () => listMessages(episodeId),
  });

  const { data: savedInsights = [] } = useQuery({
    queryKey: ["saved-insights"],
    queryFn: listSavedInsights,
  });

  useEffect(() => {
    if (episodeData) recordEpisodeVisit(episodeId);
  }, [episodeId, episodeData]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/library" });
    }
  };

  const seed = useMemo<ChatMessage | null>(() => {
    if (!episodeData) return null;
    return {
      id: "seed",
      role: "assistant",
      content: `Hi! I've listened to **${episodeData.episode.title}**. Ask me anything — recipes, books, key ideas, or specific moments.`,
      createdAt: Date.now(),
    };
  }, [episodeData]);

  const messages: ChatMessage[] = useMemo(() => {
    if (dbMessages.length > 0) return dbMessages;
    return seed ? [seed] : [];
  }, [dbMessages, seed]);

  const savedMessageIds = useMemo(
    () => new Set(savedInsights.map((i) => i.messageId)),
    [savedInsights],
  );

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [episodeId]);

  const ask = useServerFn(askEpisode);

  const toggleSaveMut = useMutation({
    mutationFn: async (msg: ChatMessage) => {
      if (msg.id === "seed") return;
      if (savedMessageIds.has(msg.id)) {
        await unsaveInsightByMessage(msg.id);
        return;
      }
      const idx = messages.findIndex((m) => m.id === msg.id);
      const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
      await saveInsight({
        messageId: msg.id,
        episodeId,
        question: prevUser?.content ?? "Chat insight",
        answer: msg.content,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-insights"] }),
  });

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);
    try {
      const userMsg = await addMessage(episodeId, "user", text);
      qc.setQueryData<ChatMessage[]>(["messages", episodeId], (prev = []) => [...prev, userMsg]);
      const history = messages
        .filter((m) => m.id !== "seed")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
      const { answer } = await ask({ data: { episodeId, question: text, history } });
      const assistantMsg = await addMessage(episodeId, "assistant", answer);
      qc.setQueryData<ChatMessage[]>(["messages", episodeId], (prev = []) => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      try {
        const assistantMsg = await addMessage(episodeId, "assistant", `⚠️ ${msg}`);
        qc.setQueryData<ChatMessage[]>(["messages", episodeId], (prev = []) => [...prev, assistantMsg]);
      } catch {
        /* ignore */
      }
    } finally {
      setThinking(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!episodeData) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <p className="font-serif text-2xl text-primary">Episode not found</p>
          <Link to="/library" className="mt-3 inline-block text-sm text-gold underline">
            Back to library
          </Link>
        </div>
      </AppShell>
    );
  }

  const { podcast, episode } = episodeData;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-4 pt-6 sm:px-6 lg:max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
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

        <TranscriptStatusPanel
          status={episode.transcriptStatus}
          error={episode.transcriptError}
        />

        {episode.transcriptStatus === "ready" && episode.summary && (
          <section className="mb-4 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Summary</p>
            <p className="mt-2 text-sm leading-relaxed text-card-foreground sm:text-base">
              {episode.summary}
            </p>
          </section>
        )}

        {episode.transcriptStatus === "ready" && episode.transcript && (
          <details className="mb-4 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-primary">
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Transcript</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {Math.round(episode.transcript.length / 1000)}k chars
                </span>
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-card-foreground/90">
              {episode.transcript}
            </p>
          </details>
        )}

        <div
          ref={scrollerRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-3xl bg-card/40 p-4 sm:p-5"
        >
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              saved={savedMessageIds.has(m.id)}
              canSave={m.role === "assistant" && m.id !== "seed"}
              onToggleSave={() => toggleSaveMut.mutate(m)}
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
          {(episode.questions.length > 0
            ? episode.questions.map((q) => q.q)
            : defaultSuggestions
          ).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={episode.transcriptStatus !== "ready"}
              className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
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
            disabled={episode.transcriptStatus !== "ready"}
            placeholder={
              episode.transcriptStatus === "ready"
                ? "Ask about this episode..."
                : "Chat unlocks once transcription finishes\u2026"
            }
            className="min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking || episode.transcriptStatus !== "ready"}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
              input.trim() && !thinking && episode.transcriptStatus === "ready"
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

function TranscriptStatusPanel({
  status,
  error,
}: {
  status: import("@/lib/data").TranscriptStatus;
  error: string | null;
}) {
  if (status === "ready") return null;
  if (status === "error") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-3xl bg-destructive/10 p-4 text-destructive shadow-sm sm:p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Transcription failed</p>
          <p className="mt-1 text-xs opacity-90">
            {error ?? "Something went wrong while processing this episode."}
          </p>
        </div>
      </div>
    );
  }
  const label =
    status === "transcribing"
      ? "Transcribing audio with Whisper\u2026"
      : status === "analyzing"
        ? "Analyzing the transcript\u2026"
        : "Importing episode\u2026";
  return (
    <div className="mb-4 flex items-start gap-3 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This can take up to a minute. You can leave this page open \u2014 the summary,
          questions and chat unlock as soon as it's done.
        </p>
      </div>
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
