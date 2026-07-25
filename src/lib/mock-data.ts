import wellnessImg from "@/assets/podcast-wellness.jpg";
import normalImg from "@/assets/podcast-normal.jpg";
import nutritionImg from "@/assets/podcast-nutrition.jpg";
import studioImg from "@/assets/podcast-studio.jpg";
import kitchenImg from "@/assets/podcast-kitchen.jpg";

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
};

export type PodcastCategory =
  | "HEALTH"
  | "TECH"
  | "FOOD"
  | "HISTORY"
  | "FEMINISM"
  | "RELATIONSHIPS";

export type Podcast = {
  id: string;
  title: string;
  host: string;
  cover: string;
  episodeCount: number;
  category: PodcastCategory;
  episodes: Episode[];
};

export const podcasts: Podcast[] = [
  {
    id: "wellness-scoop",
    title: "The Wellness Scoop",
    host: "Ella Mills",
    cover: wellnessImg,
    episodeCount: 42,
    category: "HEALTH",
    episodes: [
      {
        id: "ws-42",
        podcastId: "wellness-scoop",
        title: "Fussy Eaters, BMI Myths & The School Dessert Debate",
        duration: "58 min",
        date: "26 Mar",
        epNumber: 42,
        summary:
          "Ella and guests unpack how families can rethink fussy eating, why BMI is a blunt tool for individual health, and whether daily school desserts help or hurt long-term habits.",
        questions: [
          {
            q: "How can you boost nutrition for fussy children without changing the foods they already love?",
            a: "The key is incremental fortification \u2014 adding nutrient-dense ingredients like flaxseed, hemp hearts, or blended vegetables into familiar textures. Smoothies are ideal because the base flavour (banana, mango) masks additions well. Research from the University of Leeds suggests children accept new ingredients up to 15 times more readily when masked in preferred foods.",
          },
          {
            q: "How reliable is BMI as a measure of health, particularly for women or people recovering from disordered eating?",
            a: "BMI ignores muscle mass, bone density, fat distribution and hormonal context, so it can mislabel athletic or recovering bodies. Clinicians increasingly pair it with waist-to-height ratio, blood markers and lived experience rather than treating a single number as diagnostic.",
          },
          {
            q: "Should dessert really be served every day in primary schools?",
            a: "The panel argues that a small daily dessert normalises sweet foods and reduces the \"forbidden fruit\" effect, but portion size and quality matter more than frequency \u2014 a fruit crumble is not equivalent to a factory brownie.",
          },
        ],
        recipes: [
          { title: "Hidden-greens banana smoothie", note: "Banana, spinach, hemp hearts, oat milk, dash of cinnamon." },
          { title: "Weeknight lentil bolognese", note: "Red lentils, tinned tomatoes, grated carrot and celery, tamari for depth." },
        ],
        books: [
          { title: "The First-Time Parent's Food Book", author: "Charlotte Stirling-Reed" },
          { title: "Ultra-Processed People", author: "Chris van Tulleken" },
        ],
        misc: [
          { title: "Mentioned study", note: "University of Leeds, repeated-exposure feeding research (2022)." },
          { title: "Guest", note: "Dr. Hazel Wallace, The Food Medic." },
        ],
      },
      {
        id: "ws-41",
        podcastId: "wellness-scoop",
        title: "Cortisol, Cold Plunges & Sleep Debt",
        duration: "46 min",
        date: "19 Mar",
        epNumber: 41,
        summary: "Cutting through the wellness noise around stress hormones, ice baths, and whether you can really repay sleep debt on the weekend.",
        questions: [
          { q: "Is chronically high cortisol as common as social media suggests?", a: "For most people, no \u2014 true hypercortisolism is rare. What is common is disrupted circadian rhythm, which mimics some symptoms." },
        ],
        recipes: [],
        books: [{ title: "Why We Sleep", author: "Matthew Walker" }],
        misc: [],
      },
    ],
  },
  {
    id: "ist-das-normal",
    title: "Ist das normal?",
    host: "Dr. Sarah Weber",
    cover: normalImg,
    episodeCount: 18,
    category: "FEMINISM",
    episodes: [
      {
        id: "idn-18",
        podcastId: "ist-das-normal",
        title: "Anxiety Is Not a Personality",
        duration: "41 min",
        date: "22 Mar",
        epNumber: 18,
        summary: "Reframing anxiety as a signal rather than an identity, with practical grounding tools.",
        questions: [
          { q: "What mindfulness practices are advised in this episode?", a: "Box breathing (4-4-4-4), a five-senses grounding scan, and a two-minute \"name it to tame it\" journaling prompt before bed." },
        ],
        recipes: [],
        books: [{ title: "The Body Keeps the Score", author: "Bessel van der Kolk" }],
        misc: [],
      },
    ],
  },
  {
    id: "deep-nutrition",
    title: "Deep Nutrition",
    host: "Dr. Cate Shanahan",
    cover: nutritionImg,
    episodeCount: 31,
    category: "FOOD",
    episodes: [
      {
        id: "dn-31",
        podcastId: "deep-nutrition",
        title: "Seed Oils, Ancestral Fats and What to Actually Cook With",
        duration: "63 min",
        date: "18 Mar",
        epNumber: 31,
        summary: "A calm walk through the seed oil debate and what fats hold up in a home kitchen.",
        questions: [
          { q: "Which cooking fats does the guest actually recommend?", a: "Butter, ghee, olive oil for low-heat, and tallow or avocado oil for higher-heat searing." },
        ],
        recipes: [{ title: "Slow-roast tomato & butter sauce", note: "Halved tomatoes, cold butter, garlic, low oven for 90 minutes." }],
        books: [{ title: "Deep Nutrition", author: "Catherine Shanahan" }],
        misc: [],
      },
    ],
  },
  {
    id: "studio-sessions",
    title: "Studio Sessions",
    host: "Various Hosts",
    cover: studioImg,
    episodeCount: 12,
    category: "HISTORY",
    episodes: [
      {
        id: "ss-12",
        podcastId: "studio-sessions",
        title: "Behind the Mic: A Year of Interviews",
        duration: "72 min",
        date: "12 Mar",
        epNumber: 12,
        summary: "The team revisits the sharpest moments from a year of studio interviews.",
        questions: [],
        recipes: [],
        books: [],
        misc: [],
      },
    ],
  },
  {
    id: "kitchen-notes",
    title: "Kitchen Notes",
    host: "Iris Lang",
    cover: kitchenImg,
    episodeCount: 22,
    episodes: [
      {
        id: "kn-22",
        podcastId: "kitchen-notes",
        title: "Small Kitchens, Big Meals",
        duration: "38 min",
        date: "08 Mar",
        epNumber: 22,
        summary: "Cooking for real people in real (small) kitchens without special equipment.",
        questions: [],
        recipes: [{ title: "One-pan miso greens", note: "Any greens, miso, garlic, splash of water \u2014 seven minutes." }],
        books: [],
        misc: [],
      },
    ],
  },
];

export const findEpisode = (episodeId: string) => {
  for (const p of podcasts) {
    const ep = p.episodes.find((e) => e.id === episodeId);
    if (ep) return { podcast: p, episode: ep };
  }
  return null;
};

export const findPodcast = (podcastId: string) =>
  podcasts.find((p) => p.id === podcastId) ?? null;

export const recentEpisodes = () =>
  podcasts.slice(0, 3).map((p) => ({ podcast: p, episode: p.episodes[0] }));

export const featuredEpisode = () => ({
  podcast: podcasts[0],
  episode: podcasts[0].episodes[0],
});

export const newEpisodes = () =>
  podcasts.map((p) => ({ podcast: p, episode: p.episodes[0] })).slice(0, 4);
