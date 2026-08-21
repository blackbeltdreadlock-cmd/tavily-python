-- GPT Maker Platform - Phase 3: Publishing, reputation and moderation
-- Run in Supabase SQL Editor AFTER 002_knowledge_base.sql

-- ============================================
-- 1. Favorites
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, bot_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON favorites;
CREATE POLICY "Users manage own favorites" ON favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. Reports (basic moderation)
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('bot', 'review')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status) WHERE status = 'open';

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Reporters can file and see their own reports; triage happens outside the app.
DROP POLICY IF EXISTS "Users file own reports" ON reports;
CREATE POLICY "Users file own reports" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users see own reports" ON reports;
CREATE POLICY "Users see own reports" ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ============================================
-- 3. Review rules
-- ============================================
-- The 001 policy only checked `auth.uid() = user_id`, so anyone could review any
-- bot -- including their own, and including bots they had never acquired.

DROP POLICY IF EXISTS "Users create own reviews" ON reviews;
CREATE POLICY "Users create own reviews" ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM marketplace_listings ml
      JOIN bots b ON b.id = ml.bot_id
      WHERE ml.id = reviews.listing_id
        -- can't review your own bot
        AND b.owner_id <> auth.uid()
        -- must have acquired it first
        AND EXISTS (
          SELECT 1 FROM user_bot_access a
          WHERE a.bot_id = b.id AND a.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users delete own reviews" ON reviews;
CREATE POLICY "Users delete own reviews" ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. Rating aggregation
-- ============================================

CREATE OR REPLACE FUNCTION sync_bot_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing UUID;
  target_bot UUID;
BEGIN
  -- NEW is unassigned in a DELETE trigger, so it can't be read unconditionally.
  IF TG_OP = 'DELETE' THEN
    target_listing := OLD.listing_id;
  ELSE
    target_listing := NEW.listing_id;
  END IF;

  SELECT bot_id INTO target_bot
  FROM marketplace_listings WHERE id = target_listing;

  IF target_bot IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE bots b
  SET rating_avg = COALESCE(agg.avg_rating, 0),
      rating_count = COALESCE(agg.n, 0)
  FROM (
    SELECT avg(r.rating)::numeric(3,2) AS avg_rating, count(*) AS n
    FROM reviews r
    WHERE r.listing_id = target_listing
  ) agg
  WHERE b.id = target_bot;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bot_rating ON reviews;
CREATE TRIGGER trg_sync_bot_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION sync_bot_rating();

-- ============================================
-- 5. Publishing
-- ============================================
-- SECURITY DEFINER so the listing row can be written regardless of the caller's
-- RLS view, with ownership enforced by hand -- DEFINER bypasses RLS.

CREATE OR REPLACE FUNCTION publish_bot(
  p_bot_id UUID,
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bots WHERE id = p_bot_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the owner can publish this bot';
  END IF;

  UPDATE bots
  SET is_published = true,
      is_public = true,
      category = COALESCE(p_category, category),
      tags = COALESCE(p_tags, tags),
      updated_at = now()
  WHERE id = p_bot_id;

  -- Paid listings are refused while there is no charging flow, so a bot can
  -- never be advertised at a price the app would not actually collect.
  INSERT INTO marketplace_listings (bot_id, price_type, price_amount)
  VALUES (p_bot_id, 'free', 0)
  ON CONFLICT (bot_id) DO UPDATE
    SET price_type = 'free',
        price_amount = 0,
        updated_at = now()
  RETURNING id INTO listing_id;

  RETURN listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION unpublish_bot(p_bot_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bots WHERE id = p_bot_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the owner can unpublish this bot';
  END IF;

  DELETE FROM marketplace_listings WHERE bot_id = p_bot_id;

  UPDATE bots
  SET is_published = false, updated_at = now()
  WHERE id = p_bot_id;
END;
$$;

REVOKE ALL ON FUNCTION publish_bot(UUID, TEXT, TEXT[]) FROM public;
REVOKE ALL ON FUNCTION unpublish_bot(UUID) FROM public;
GRANT EXECUTE ON FUNCTION publish_bot(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION unpublish_bot(UUID) TO authenticated;

-- ============================================
-- 6. Creator dashboard aggregate
-- ============================================

CREATE OR REPLACE FUNCTION creator_stats()
RETURNS TABLE (
  bot_id UUID,
  name TEXT,
  avatar_url TEXT,
  is_published BOOLEAN,
  acquisitions BIGINT,
  conversations BIGINT,
  rating_avg NUMERIC,
  rating_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    b.id,
    b.name,
    b.avatar_url,
    b.is_published,
    (SELECT count(*) FROM user_bot_access a WHERE a.bot_id = b.id),
    (SELECT count(*) FROM conversations c WHERE c.bot_id = b.id),
    b.rating_avg,
    b.rating_count
  FROM bots b
  WHERE b.owner_id = auth.uid()
  ORDER BY b.is_published DESC, b.rating_avg DESC, b.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION creator_stats() TO authenticated;

-- ============================================
-- 7. Indexes for sorting
-- ============================================

CREATE INDEX IF NOT EXISTS idx_listings_featured
  ON marketplace_listings(is_featured DESC, download_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_recent
  ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bots_rating
  ON bots(rating_avg DESC) WHERE is_published = true;
