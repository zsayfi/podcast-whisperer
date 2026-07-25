import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Send, Mic, FileText, Loader2, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/app-shell";
import { listPodcastsWithEpisodes, type PodcastCategory } from "@/lib/data";
import { importTranscript } from "@/lib/import.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lume \u2014 Podcast Q&A" },
      { name: "description", content: "Paste any podcast episode link. Lume transcribes it, then answers your questions about books, recipes, ideas and more." },
      { property: "og:title", content: "Lume \u2014 Podcast Q&A" },
      { property: "og:description", content: "Paste any podcast episode link. Lume transcribes it, then answers your questions about books, recipes, ideas and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const filters: PodcastCategory[] = ["HEALTH", "TECH", "FOOD", "HISTORY", "FEMINISM", "RELATIONSHIPS"];

type ScanState =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string };

function HomePage() {
  const navigate = useNavigate();
  const importFn = useServerFn(importTranscript);

  const { data: podcasts = [] } = useQuery({
    queryKey: ["podcasts-with-episodes"],
    queryFn: listPodcastsWithEpisodes,
  });

  const recent = useMemo(
    () =>
      podcasts
        .filter((p) => p.episodes.length > 0)
        .slice(0, 3)
        .map((p) => ({ podcast: p, episode: p.episodes[0] })),
    [podcasts],
  );

  const fresh = useMemo(
    () =>
      podcasts
        .filter((p) => p.episodes.length > 0)
        .map((p) => ({ podcast: p, episode: p.episodes[0] })),
    [podcasts],
  );

  const [activeFilter, setActiveFilter] = useState<PodcastCategory>("HEALTH");
  const [prompt, setPrompt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [selectedPodcastId, setSelectedPodcastId] = useState<string>("");
  const [podcastName, setPodcastName] = useState("");
  const [episodeName, setEpisodeName] = useState("");
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });

  const isNewPodcast = selectedPodcastId === "__new__";

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = transcript.trim();
    if (!text || scan.kind === "working") return;
    setScan({ kind: "working", label: "Analyzing transcript\u2026" });
    try {
      const { episodeId } = await importFn({
        data: {
          transcript: text,
          podcastId:
            selectedPodcastId && !isNewPodcast ? selectedPodcastId : undefined,
          podcastName: isNewPodcast
            ? podcastName.trim() || undefined
            : undefined,
          episodeName: episodeName.trim() || undefined,
        },
      });
      setTranscript("");
      setPodcastName("");
      setEpisodeName("");
      setSelectedPodcastId("");
      setScan({ kind: "idle" });
      navigate({ to: "/episode/$episodeId", params: { episodeId } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setScan({ kind: "error", message });
    }
  };



  return (
    <AppShell>
      <PageHeader title="My recent podcasts" subtitle="Latest episodes you have listened to" />

      <section className="-mx-5 mb-10 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="flex gap-3 pb-2 sm:grid sm:grid-cols-3 sm:gap-4">
          {recent.map(({ podcast, episode }) => (
            <li key={episode.id} className="min-w-[42%] sm:min-w-0">
              <Link
                to="/episode/$episodeId"
                params={{ episodeId: episode.id }}
                className="group relative block aspect-square overflow-hidden rounded-3xl shadow-sm"
              >
                <img
                  src={podcast.cover}
                  alt={podcast.title}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/85 via-primary/40 to-transparent p-3 pt-10 text-primary-foreground">
                  <p className="text-sm font-semibold leading-tight">{podcast.title}</p>
                  <p className="text-xs opacity-90">Ep. {episode.epNumber}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-3xl font-bold text-primary sm:text-4xl">Latest Lume highlights</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Intelligent AI support helping to browse through your favourite podcasts
        </p>

        <div className="mt-5 rounded-3xl bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Mic className="h-5 w-5" />
            </span>
            <p className="pt-1 text-sm leading-relaxed text-card-foreground sm:text-base">
              Hello! How is it going? Ask me anything about the podcasts in your library.
            </p>
          </div>

          <form
            className="mt-4 flex items-center gap-2 rounded-full bg-background/70 px-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPrompt("");
            }}
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What is Ella's favourite book right now?"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-primary/10"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
          Transcript import
        </p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-primary sm:text-4xl">
          Add a podcast episode
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name the show and episode, paste the transcript, and Lume will summarize it and open a chat.
        </p>

        <form
          onSubmit={handleScan}
          className="mt-5 space-y-3 rounded-3xl bg-card p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-center gap-2 rounded-full bg-background/70 px-4 py-2">
            <Mic className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={podcastName}
              onChange={(e) => setPodcastName(e.target.value)}
              placeholder="Podcast name (e.g. The Wellness Scoop)"
              disabled={scan.kind === "working"}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-background/70 px-4 py-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={episodeName}
              onChange={(e) => setEpisodeName(e.target.value)}
              placeholder="Episode name"
              disabled={scan.kind === "working"}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-background/70 px-4 py-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full episode transcript here\u2026"
              disabled={scan.kind === "working"}
              rows={1}
              className="h-10 min-w-0 flex-1 resize-none overflow-hidden overflow-x-auto whitespace-nowrap bg-transparent py-2.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={scan.kind === "working" || !transcript.trim()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold tracking-wide transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60",
            )}
          >
            {scan.kind === "working" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {scan.label}
              </>
            ) : (
              "Analyze transcript"
            )}
          </button>
          {scan.kind === "error" && (
            <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{scan.message}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Podcast and episode names are optional. Lume falls back to a generated title if you leave them blank.
          </p>
        </form>
      </section>



      <section className="mt-10">
        <h2 className="font-serif text-3xl font-bold text-primary sm:text-4xl">New episodes</h2>
        <p className="mt-1 text-sm text-muted-foreground">New episodes of your favourite podcasts</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-colors",
                  active
                    ? "bg-gold text-gold-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {f}
              </button>
            );
          })}
        </div>

        {(() => {
          const filtered = fresh.filter(({ podcast }) => podcast.category === activeFilter);
          if (filtered.length === 0) {
            return (
              <p className="mt-6 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
                No {activeFilter.toLowerCase()} episodes yet. Add a podcast above to get started.
              </p>
            );
          }
          return (
            <ul className="mt-5 space-y-4">
              {filtered.map(({ podcast, episode }) => (
                <li key={episode.id}>
              <Link
                to="/episode/$episodeId"
                params={{ episodeId: episode.id }}
                className="flex overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <img
                  src={podcast.cover}
                  alt={podcast.title}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="h-28 w-24 shrink-0 object-cover sm:h-32 sm:w-32"
                />
                <div className="min-w-0 flex-1 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold">
                    {podcast.title}
                  </p>
                  <p className="mt-1 font-serif text-base font-bold leading-snug text-primary sm:text-lg">
                    {episode.title}
                  </p>
                  <p className="mt-2 text-xs text-card-foreground/80">
                    {"\u25CB"} {episode.duration} · {episode.date}
                  </p>
                </div>
              </Link>
                </li>
              ))}
            </ul>
          );
        })()}
      </section>

    </AppShell>
  );
}
