
CREATE TABLE public.podcasts (
  id text PRIMARY KEY,
  title text NOT NULL,
  host text NOT NULL,
  cover_key text NOT NULL,
  episode_count integer NOT NULL DEFAULT 0,
  category text NOT NULL CHECK (category IN ('HEALTH','TECH','FOOD','HISTORY','FEMINISM','RELATIONSHIPS')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcasts TO anon, authenticated;
GRANT ALL ON public.podcasts TO service_role;
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw podcasts" ON public.podcasts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.episodes (
  id text PRIMARY KEY,
  podcast_id text NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  title text NOT NULL,
  duration text NOT NULL,
  date_label text NOT NULL,
  ep_number integer NOT NULL,
  summary text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipes jsonb NOT NULL DEFAULT '[]'::jsonb,
  books jsonb NOT NULL DEFAULT '[]'::jsonb,
  misc jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO anon, authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw episodes" ON public.episodes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX episodes_podcast_sort_idx ON public.episodes(podcast_id, sort_order);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id text NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX chat_messages_episode_created_idx ON public.chat_messages(episode_id, created_at);

CREATE TABLE public.saved_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid UNIQUE REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  episode_id text NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_insights TO anon, authenticated;
GRANT ALL ON public.saved_insights TO service_role;
ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw insights" ON public.saved_insights FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.saved_tags (
  tag text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_tags TO anon, authenticated;
GRANT ALL ON public.saved_tags TO service_role;
ALTER TABLE public.saved_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw tags" ON public.saved_tags FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.favourite_podcasts (
  podcast_id text PRIMARY KEY REFERENCES public.podcasts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favourite_podcasts TO anon, authenticated;
GRANT ALL ON public.favourite_podcasts TO service_role;
ALTER TABLE public.favourite_podcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw favs" ON public.favourite_podcasts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.episode_visits (
  episode_id text PRIMARY KEY REFERENCES public.episodes(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episode_visits TO anon, authenticated;
GRANT ALL ON public.episode_visits TO service_role;
ALTER TABLE public.episode_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw visits" ON public.episode_visits FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.podcasts (id, title, host, cover_key, episode_count, category, sort_order) VALUES
  ('wellness-scoop','The Wellness Scoop','Ella Mills','wellness',42,'HEALTH',1),
  ('ist-das-normal','Ist das normal?','Dr. Sarah Weber','normal',18,'FEMINISM',2),
  ('deep-nutrition','Deep Nutrition','Dr. Cate Shanahan','nutrition',31,'FOOD',3),
  ('studio-sessions','Studio Sessions','Various Hosts','studio',12,'HISTORY',4),
  ('kitchen-notes','Kitchen Notes','Iris Lang','kitchen',22,'FOOD',5);

INSERT INTO public.episodes (id, podcast_id, title, duration, date_label, ep_number, summary, questions, recipes, books, misc, sort_order) VALUES
  ('ws-42','wellness-scoop','Fussy Eaters, BMI Myths & The School Dessert Debate','58 min','26 Mar',42,
    'Ella and guests unpack how families can rethink fussy eating, why BMI is a blunt tool for individual health, and whether daily school desserts help or hurt long-term habits.',
    '[{"q":"How can you boost nutrition for fussy children without changing the foods they already love?","a":"The key is incremental fortification — adding nutrient-dense ingredients like flaxseed, hemp hearts, or blended vegetables into familiar textures. Smoothies are ideal because the base flavour (banana, mango) masks additions well. Research from the University of Leeds suggests children accept new ingredients up to 15 times more readily when masked in preferred foods."},{"q":"How reliable is BMI as a measure of health, particularly for women or people recovering from disordered eating?","a":"BMI ignores muscle mass, bone density, fat distribution and hormonal context, so it can mislabel athletic or recovering bodies. Clinicians increasingly pair it with waist-to-height ratio, blood markers and lived experience rather than treating a single number as diagnostic."},{"q":"Should dessert really be served every day in primary schools?","a":"The panel argues that a small daily dessert normalises sweet foods and reduces the \"forbidden fruit\" effect, but portion size and quality matter more than frequency — a fruit crumble is not equivalent to a factory brownie."}]'::jsonb,
    '[{"title":"Hidden-greens banana smoothie","note":"Banana, spinach, hemp hearts, oat milk, dash of cinnamon."},{"title":"Weeknight lentil bolognese","note":"Red lentils, tinned tomatoes, grated carrot and celery, tamari for depth."}]'::jsonb,
    '[{"title":"The First-Time Parent''s Food Book","author":"Charlotte Stirling-Reed"},{"title":"Ultra-Processed People","author":"Chris van Tulleken"}]'::jsonb,
    '[{"title":"Mentioned study","note":"University of Leeds, repeated-exposure feeding research (2022)."},{"title":"Guest","note":"Dr. Hazel Wallace, The Food Medic."}]'::jsonb,
    1),
  ('ws-41','wellness-scoop','Cortisol, Cold Plunges & Sleep Debt','46 min','19 Mar',41,
    'Cutting through the wellness noise around stress hormones, ice baths, and whether you can really repay sleep debt on the weekend.',
    '[{"q":"Is chronically high cortisol as common as social media suggests?","a":"For most people, no — true hypercortisolism is rare. What is common is disrupted circadian rhythm, which mimics some symptoms."}]'::jsonb,
    '[]'::jsonb,
    '[{"title":"Why We Sleep","author":"Matthew Walker"}]'::jsonb,
    '[]'::jsonb,
    2),
  ('idn-18','ist-das-normal','Anxiety Is Not a Personality','41 min','22 Mar',18,
    'Reframing anxiety as a signal rather than an identity, with practical grounding tools.',
    '[{"q":"What mindfulness practices are advised in this episode?","a":"Box breathing (4-4-4-4), a five-senses grounding scan, and a two-minute \"name it to tame it\" journaling prompt before bed."}]'::jsonb,
    '[]'::jsonb,
    '[{"title":"The Body Keeps the Score","author":"Bessel van der Kolk"}]'::jsonb,
    '[]'::jsonb,
    1),
  ('dn-31','deep-nutrition','Seed Oils, Ancestral Fats and What to Actually Cook With','63 min','18 Mar',31,
    'A calm walk through the seed oil debate and what fats hold up in a home kitchen.',
    '[{"q":"Which cooking fats does the guest actually recommend?","a":"Butter, ghee, olive oil for low-heat, and tallow or avocado oil for higher-heat searing."}]'::jsonb,
    '[{"title":"Slow-roast tomato & butter sauce","note":"Halved tomatoes, cold butter, garlic, low oven for 90 minutes."}]'::jsonb,
    '[{"title":"Deep Nutrition","author":"Catherine Shanahan"}]'::jsonb,
    '[]'::jsonb,
    1),
  ('ss-12','studio-sessions','Behind the Mic: A Year of Interviews','72 min','12 Mar',12,
    'The team revisits the sharpest moments from a year of studio interviews.',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 1),
  ('kn-22','kitchen-notes','Small Kitchens, Big Meals','38 min','08 Mar',22,
    'Cooking for real people in real (small) kitchens without special equipment.',
    '[]'::jsonb,
    '[{"title":"One-pan miso greens","note":"Any greens, miso, garlic, splash of water — seven minutes."}]'::jsonb,
    '[]'::jsonb, '[]'::jsonb, 1);
