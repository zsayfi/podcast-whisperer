import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Play, Clock, Calendar, Sparkles, Bookmark } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { featuredEpisode, podcasts } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const favouritePodcasts = [podcasts[0], podcasts[1], podcasts[2], podcasts[4]];

const savedInsights = [
  {
    tag: "MINDFULNESS",
    source: "Ist das normal? \u00b7 Ep 18",
    text: "Box breathing (4-4-4-4) and a five-senses grounding scan work best when practised before bed, not during a panic spike.",
  },
  {
    tag: "NUTRITION",
    source: "The Wellness Scoop \u00b7 Ep 42",
    text: "Hide nutrient-dense ingredients (flaxseed, hemp, blended greens) inside foods kids already love \u2014 acceptance jumps up to 15\u00d7.",
  },
  {
    tag: "COOKING",
    source: "Deep Nutrition \u00b7 Ep 31",
    text: "Use butter, ghee or olive oil for low heat; tallow or avocado oil for high-heat searing. Skip seed oils where you can.",
  },
];

export const Route = createFileRoute("/saved")({
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

const tabs = ["QUESTIONS", "RECIPES", "BOOKS", "MISC"] as const;
type Tab = (typeof tabs)[number];

function SavedPage() {
  const { podcast, episode } = featuredEpisode();
  const [tab, setTab] = useState<Tab>("QUESTIONS");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items =
    tab === "QUESTIONS"
      ? episode.questions.map((q) => ({ title: q.q, body: q.a }))
      : tab === "RECIPES"
        ? episode.recipes.map((r) => ({ title: r.title, body: r.note }))
        : tab === "BOOKS"
          ? episode.books.map((b) => ({ title: b.title, body: b.author }))
          : episode.misc.map((m) => ({ title: m.title, body: m.note }));

  return (
    <AppShell>
      <PageHeader title="Favourites" subtitle="Your favourites recap" />

      <section className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-bold text-primary">Favourite podcasts</h2>
          <span className="text-xs text-muted-foreground">{favouritePodcasts.length} saved</span>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {favouritePodcasts.map((p) => (
            <Link
              key={p.id}
              to="/episode/$episodeId"
              params={{ episodeId: p.episodes[0].id }}
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

      <h2 className="mb-3 font-serif text-lg font-bold text-primary">Featured episode</h2>


      <Link
        to="/episode/$episodeId"
        params={{ episodeId: episode.id }}
        className="mb-6 flex overflow-hidden rounded-3xl shadow-sm"
      >
        <img
          src={podcast.cover}
          alt={podcast.title}
          loading="lazy"
          width={800}
          height={800}
          className="h-40 w-32 shrink-0 object-cover"
        />
        <div className="min-w-0 flex-1 bg-primary p-4 text-primary-foreground">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
            {podcast.title}
          </p>
          <p className="mt-1 font-serif text-base font-bold leading-snug sm:text-lg">
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
      </Link>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t;
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
    </AppShell>
  );
}
