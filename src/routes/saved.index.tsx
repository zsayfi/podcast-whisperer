import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Play, Clock, Calendar, Sparkles, Bookmark, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  addSavedTag,
  getLastVisitedEpisode,
  getPodcast,
  listFavouritePodcastIds,
  listPodcasts,
  listSavedInsights,
  listSavedTags,
  removeSavedTag,
  type PodcastCategory,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/saved/")({
  head: () => ({
    meta: [
      { title: "Saved \u2014 Lume" },
      { name: "description", content: "Your favourite questions, recipes, books, and moments from every podcast." },
      { property: "og:title", content: "Saved \u2014 Lume" },
      { property: "og:description", content: "Your favourite questions, recipes, books, and moments from every podcast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavedPage,
});

type TabLabel = "QUESTIONS" | "RECIPES" | "BOOKS" | "MISC" | "PRACTICES" | "TOOLS" | "PEOPLE";

const TABS_BY_CATEGORY: Record<PodcastCategory, TabLabel[]> = {
  HEALTH: ["QUESTIONS", "PRACTICES", "RECIPES", "BOOKS"],
  FOOD: ["QUESTIONS", "RECIPES", "BOOKS", "MISC"],
  FEMINISM: ["QUESTIONS", "PRACTICES", "BOOKS", "MISC"],
  RELATIONSHIPS: ["QUESTIONS", "PRACTICES", "BOOKS", "MISC"],
  HISTORY: ["QUESTIONS", "PEOPLE", "BOOKS", "MISC"],
  TECH: ["QUESTIONS", "TOOLS", "BOOKS", "MISC"],
};

const LABEL_TO_FIELD: Record<TabLabel, "questions" | "recipes" | "books" | "misc"> = {
  QUESTIONS: "questions",
  RECIPES: "recipes",
  BOOKS: "books",
  MISC: "misc",
  PRACTICES: "misc",
  TOOLS: "misc",
  PEOPLE: "misc",
};

function SavedPage() {
  const qc = useQueryClient();

  const { data: allPodcasts = [] } = useQuery({
    queryKey: ["podcasts"],
    queryFn: listPodcasts,
  });

  const { data: favIds = [] } = useQuery({
    queryKey: ["favourite-podcast-ids"],
    queryFn: listFavouritePodcastIds,
  });

  const favouritePodcasts = useMemo(() => {
    if (favIds.length === 0) return allPodcasts;
    const map = new Map(allPodcasts.map((p) => [p.id, p]));
    return favIds.map((id) => map.get(id)).filter((p): p is (typeof allPodcasts)[number] => Boolean(p));
  }, [favIds, allPodcasts]);

  const { data: lastVisited } = useQuery({
    queryKey: ["last-visited-episode"],
    queryFn: getLastVisitedEpisode,
  });

  // Fallback featured: first episode of first podcast
  const { data: fallbackPodcast } = useQuery({
    queryKey: ["podcast", allPodcasts[0]?.id],
    queryFn: () => (allPodcasts[0] ? getPodcast(allPodcasts[0].id) : Promise.resolve(null)),
    enabled: !lastVisited && allPodcasts.length > 0,
  });

  const featured = lastVisited
    ? lastVisited
    : fallbackPodcast && fallbackPodcast.episodes[0]
      ? { podcast: fallbackPodcast, episode: fallbackPodcast.episodes[0] }
      : null;

  const tabs = featured ? TABS_BY_CATEGORY[featured.podcast.category] : ["QUESTIONS"] as TabLabel[];
  const [tab, setTab] = useState<TabLabel>("QUESTIONS");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeTag, setActiveTag] = useState<string>("ALL");
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  // Reset tab if not in current tabs set
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  const field = LABEL_TO_FIELD[activeTab];
  const items = featured
    ? field === "questions"
      ? featured.episode.questions.map((q) => ({ title: q.q, body: q.a }))
      : field === "recipes"
        ? featured.episode.recipes.map((r) => ({ title: r.title, body: r.note }))
        : field === "books"
          ? featured.episode.books.map((b) => ({ title: b.title, body: b.author }))
          : featured.episode.misc.map((m) => ({ title: m.title, body: m.note }))
    : [];

  const { data: savedInsights = [] } = useQuery({
    queryKey: ["saved-insights"],
    queryFn: listSavedInsights,
  });

  const { data: customTags = [] } = useQuery({
    queryKey: ["saved-tags"],
    queryFn: listSavedTags,
  });

  const addTagMut = useMutation({
    mutationFn: addSavedTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-tags"] }),
  });
  const removeTagMut = useMutation({
    mutationFn: removeSavedTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-tags"] }),
  });

  const baseTags = Array.from(new Set(savedInsights.map((i) => i.tag).filter(Boolean) as string[]));
  const tags = ["ALL", ...baseTags, ...customTags.filter((t) => !baseTags.includes(t))];
  const filtered =
    activeTag === "ALL"
      ? savedInsights
      : savedInsights.filter((i) => i.tag === activeTag);

  const commitTag = () => {
    const t = newTag.trim().toUpperCase();
    if (t && !tags.includes(t)) {
      addTagMut.mutate(t);
      setActiveTag(t);
    }
    setNewTag("");
    setAddingTag(false);
  };

  return (
    <AppShell>
      <PageHeader title="Saved" subtitle="Your saved recap" />

      <section className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-bold text-primary">Favourite podcasts</h2>
          <span className="text-xs text-muted-foreground">{favouritePodcasts.length} saved</span>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {favouritePodcasts.map((p) => (
            <Link
              key={p.id}
              to="/saved/show/$podcastId"
              params={{ podcastId: p.id }}
              className="w-32 shrink-0 snap-start"
            >
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <img
                  src={p.cover}
                  alt={p.title}
                  loading="lazy"
                  width={400}
                  height={400}
                  className="aspect-square w-full object-cover"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold text-primary">{p.title}</p>
              <p className="text-[10px] text-muted-foreground">{p.episodeCount} episodes</p>
            </Link>
          ))}
        </div>
      </section>

      {featured && (
        <>
          <h2 className="mb-3 font-serif text-lg font-bold text-primary">
            {lastVisited ? "Latest episode you checked" : "Featured episode"}
          </h2>

          <Link
            to="/episode/$episodeId"
            params={{ episodeId: featured.episode.id }}
            className="mb-6 flex overflow-hidden rounded-3xl shadow-sm"
          >
            <img
              src={featured.podcast.cover}
              alt={featured.podcast.title}
              loading="lazy"
              width={800}
              height={800}
              className="h-40 w-32 shrink-0 object-cover"
            />
            <div className="min-w-0 flex-1 bg-primary p-4 text-primary-foreground">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
                {featured.podcast.title}
              </p>
              <p className="mt-1 font-serif text-base font-bold leading-snug sm:text-lg">
                {featured.episode.title}
              </p>
              <p className="mt-2 flex items-center gap-3 text-xs text-primary-foreground/80">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{featured.episode.duration}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{featured.episode.date}</span>
              </p>
              <button className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground">
                <Play className="h-3 w-3 fill-current" /> Play episode
              </button>
            </div>
          </Link>

          <div className="mb-4 flex flex-wrap gap-2">
            {tabs.map((t) => {
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setOpenIndex(0);
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-colors",
                    active
                      ? "bg-gold text-gold-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <ul className="space-y-3">
            {items.map((item, i) => {
              const open = openIndex === i;
              return (
                <li key={i} className="overflow-hidden rounded-2xl bg-card/70">
                  <button
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  >
                    <span className="text-sm font-semibold leading-snug text-primary sm:text-base">
                      {item.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <div className="bg-card px-4 pb-5 pt-1 text-sm leading-relaxed text-card-foreground">
                      {item.body}
                    </div>
                  )}
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="rounded-2xl bg-card/70 p-6 text-center text-sm text-muted-foreground">
                Nothing saved here yet.
              </li>
            )}
          </ul>
        </>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="font-serif text-lg font-bold text-primary">Saved by Lume</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Insights you bookmarked from your chats with the AI agent.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tags.map((t) => {
            const active = activeTag === t;
            const isCustom = customTags.includes(t) && !baseTags.includes(t);
            return (
              <span
                key={t}
                className={cn(
                  "inline-flex items-center rounded-full text-[11px] font-bold tracking-wide transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-primary hover:bg-primary/10",
                )}
              >
                <button onClick={() => setActiveTag(t)} className="px-3 py-1.5">
                  {t}
                </button>
                {isCustom && (
                  <button
                    onClick={() => {
                      removeTagMut.mutate(t);
                      if (activeTag === t) setActiveTag("ALL");
                    }}
                    aria-label={`Remove ${t}`}
                    className="pr-2 opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
          {addingTag ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1">
              <input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTag();
                  if (e.key === "Escape") {
                    setNewTag("");
                    setAddingTag(false);
                  }
                }}
                onBlur={commitTag}
                placeholder="New tag"
                maxLength={20}
                className="w-24 bg-transparent text-[11px] font-bold uppercase tracking-wide text-primary outline-none placeholder:text-muted-foreground"
              />
            </span>
          ) : (
            <button
              onClick={() => setAddingTag(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-3 py-1.5 text-[11px] font-bold tracking-wide text-primary hover:bg-primary/10"
            >
              <Plus className="h-3 w-3" /> NEW
            </button>
          )}
        </div>

        <ul className="space-y-3">
          {filtered.map((insight) => (
            <li key={insight.id} className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                {insight.tag ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                    {insight.tag}
                  </span>
                ) : (
                  <span />
                )}
                <Bookmark className="h-4 w-4 fill-gold text-gold" />
              </div>
              <p className="text-xs italic text-muted-foreground">Q: {insight.question}</p>
              <p className="mt-1 text-sm leading-relaxed text-card-foreground">{insight.answer}</p>
              <p className="mt-2 text-[11px] italic text-muted-foreground">
                {insight.podcastTitle} · {insight.episodeTitle}
              </p>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-2xl bg-card/70 p-6 text-center text-sm text-muted-foreground">
              No saved insights for this tag yet.
            </li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}
