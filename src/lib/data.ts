import { supabase } from "@/integrations/supabase/client";
import wellnessImg from "@/assets/podcast-wellness.jpg";
import normalImg from "@/assets/podcast-normal.jpg";
import nutritionImg from "@/assets/podcast-nutrition.jpg";
import studioImg from "@/assets/podcast-studio.jpg";
import kitchenImg from "@/assets/podcast-kitchen.jpg";

export type PodcastCategory =
  | "HEALTH"
  | "TECH"
  | "FOOD"
  | "HISTORY"
  | "FEMINISM"
  | "RELATIONSHIPS";

export type TranscriptStatus =
  | "pending"
  | "importing"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "error";

export type Episode = {
  id: string;
  podcastId: string;
  title: string;
  duration: string;
  date: string;
  epNumber: number;
  summary: string;
  questions: { q: string; a: string }[];
  recipes: { title: string; note: string }[];
  books: { title: string; author: string }[];
  misc: { title: string; note: string }[];
  sourceUrl: string | null;
  audioUrl: string | null;
  transcript: string;
  transcriptStatus: TranscriptStatus;
  transcriptError: string | null;
};

export type Podcast = {
  id: string;
  title: string;
  host: string;
  cover: string;
  coverKey: string;
  episodeCount: number;
  category: PodcastCategory;
};

export type PodcastWithEpisodes = Podcast & { episodes: Episode[] };

export const COVERS: Record<string, string> = {
  wellness: wellnessImg,
  normal: normalImg,
  nutrition: nutritionImg,
  studio: studioImg,
  kitchen: kitchenImg,
};

const coverFor = (key: string) => COVERS[key] ?? wellnessImg;

type PodcastRow = {
  id: string;
  title: string;
  host: string;
  cover_key: string;
  episode_count: number;
  category: PodcastCategory;
  sort_order: number;
};

type EpisodeRow = {
  id: string;
  podcast_id: string;
  title: string;
  duration: string;
  date_label: string;
  ep_number: number;
  summary: string;
  questions: Episode["questions"];
  recipes: Episode["recipes"];
  books: Episode["books"];
  misc: Episode["misc"];
  sort_order: number;
};

const mapPodcast = (r: PodcastRow): Podcast => ({
  id: r.id,
  title: r.title,
  host: r.host,
  cover: coverFor(r.cover_key),
  coverKey: r.cover_key,
  episodeCount: r.episode_count,
  category: r.category,
});

const mapEpisode = (r: EpisodeRow): Episode => ({
  id: r.id,
  podcastId: r.podcast_id,
  title: r.title,
  duration: r.duration,
  date: r.date_label,
  epNumber: r.ep_number,
  summary: r.summary,
  questions: r.questions ?? [],
  recipes: r.recipes ?? [],
  books: r.books ?? [],
  misc: r.misc ?? [],
});

// ---------- podcasts / episodes ----------

export async function listPodcasts(): Promise<Podcast[]> {
  const { data, error } = await supabase
    .from("podcasts")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data as unknown as PodcastRow[]).map(mapPodcast);
}

export async function listPodcastsWithEpisodes(): Promise<PodcastWithEpisodes[]> {
  const [pods, epsRes] = await Promise.all([
    listPodcasts(),
    supabase.from("episodes").select("*").order("sort_order"),
  ]);
  if (epsRes.error) throw epsRes.error;
  const byPodcast = new Map<string, Episode[]>();
  for (const r of epsRes.data as unknown as EpisodeRow[]) {
    const ep = mapEpisode(r);
    if (!byPodcast.has(ep.podcastId)) byPodcast.set(ep.podcastId, []);
    byPodcast.get(ep.podcastId)!.push(ep);
  }
  return pods.map((p) => ({ ...p, episodes: byPodcast.get(p.id) ?? [] }));
}

export async function getPodcast(id: string): Promise<PodcastWithEpisodes | null> {
  const { data: p, error } = await supabase
    .from("podcasts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;
  const { data: eps, error: e2 } = await supabase
    .from("episodes")
    .select("*")
    .eq("podcast_id", id)
    .order("sort_order");
  if (e2) throw e2;
  return {
    ...mapPodcast(p as unknown as PodcastRow),
    episodes: (eps as unknown as EpisodeRow[]).map(mapEpisode),
  };
}

export async function getEpisode(
  episodeId: string,
): Promise<{ podcast: Podcast; episode: Episode } | null> {
  const { data: ep, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", episodeId)
    .maybeSingle();
  if (error) throw error;
  if (!ep) return null;
  const { data: p, error: pe } = await supabase
    .from("podcasts")
    .select("*")
    .eq("id", (ep as unknown as EpisodeRow).podcast_id)
    .maybeSingle();
  if (pe) throw pe;
  if (!p) return null;
  return {
    podcast: mapPodcast(p as unknown as PodcastRow),
    episode: mapEpisode(ep as unknown as EpisodeRow),
  };
}

// ---------- chat ----------

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export async function listMessages(episodeId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("episode_id", episodeId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function addMessage(
  episodeId: string,
  role: "user" | "assistant",
  content: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ episode_id: episodeId, role, content })
    .select("id, role, content, created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    role: data.role as "user" | "assistant",
    content: data.content,
    createdAt: new Date(data.created_at).getTime(),
  };
}

// ---------- saved insights ----------

export type SavedInsight = {
  id: string;
  messageId: string;
  episodeId: string;
  episodeTitle: string;
  podcastTitle: string;
  question: string;
  answer: string;
  tag: string | null;
  createdAt: number;
};

export async function listSavedInsights(): Promise<SavedInsight[]> {
  const { data, error } = await supabase
    .from("saved_insights")
    .select(
      "id, message_id, episode_id, question, answer, tag, created_at, episodes(title, podcasts(title))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    messageId: r.message_id,
    episodeId: r.episode_id,
    question: r.question,
    answer: r.answer,
    tag: r.tag,
    episodeTitle: r.episodes?.title ?? "",
    podcastTitle: r.episodes?.podcasts?.title ?? "",
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function saveInsight(input: {
  messageId: string;
  episodeId: string;
  question: string;
  answer: string;
  tag?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("saved_insights").insert({
    message_id: input.messageId,
    episode_id: input.episodeId,
    question: input.question,
    answer: input.answer,
    tag: input.tag ?? null,
  });
  if (error) throw error;
}

export async function unsaveInsightByMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_insights")
    .delete()
    .eq("message_id", messageId);
  if (error) throw error;
}

// ---------- saved tags ----------

export async function listSavedTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_tags")
    .select("tag")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => r.tag);
}

export async function addSavedTag(tag: string): Promise<void> {
  const { error } = await supabase.from("saved_tags").upsert({ tag });
  if (error) throw error;
}

export async function removeSavedTag(tag: string): Promise<void> {
  const { error } = await supabase.from("saved_tags").delete().eq("tag", tag);
  if (error) throw error;
}

// ---------- favourites ----------

export async function listFavouritePodcastIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("favourite_podcasts")
    .select("podcast_id")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => r.podcast_id);
}

export async function addFavouritePodcast(id: string): Promise<void> {
  const { error } = await supabase
    .from("favourite_podcasts")
    .upsert({ podcast_id: id });
  if (error) throw error;
}

export async function removeFavouritePodcast(id: string): Promise<void> {
  const { error } = await supabase
    .from("favourite_podcasts")
    .delete()
    .eq("podcast_id", id);
  if (error) throw error;
}

// ---------- visits ----------

export async function recordEpisodeVisit(episodeId: string): Promise<void> {
  await supabase.from("episode_visits").upsert({
    episode_id: episodeId,
    visited_at: new Date().toISOString(),
  });
}

export async function getLastVisitedEpisode(): Promise<
  { podcast: Podcast; episode: Episode } | null
> {
  const { data, error } = await supabase
    .from("episode_visits")
    .select("episode_id")
    .order("visited_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return getEpisode(data.episode_id);
}
