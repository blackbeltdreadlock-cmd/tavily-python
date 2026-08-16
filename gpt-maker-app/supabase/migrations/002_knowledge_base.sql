-- GPT Maker Platform - Phase 2: Knowledge Base with Full-Text Search
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql

-- ============================================
-- 1. Extend bot_knowledge (now represents a DOCUMENT)
-- ============================================

ALTER TABLE bot_knowledge
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready'
    CHECK (status IN ('processing', 'ready', 'error')),
  ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ============================================
-- 2. Chunks table (the unit that actually gets searched)
-- ============================================

CREATE TABLE IF NOT EXISTS bot_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID REFERENCES bot_knowledge(id) ON DELETE CASCADE NOT NULL,
  -- bot_id is denormalized so retrieval can filter without a join
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  -- Generated column: stays in sync automatically, no trigger needed
  tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (knowledge_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON bot_knowledge_chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_chunks_bot ON bot_knowledge_chunks(bot_id);
CREATE INDEX IF NOT EXISTS idx_chunks_knowledge ON bot_knowledge_chunks(knowledge_id);

-- ============================================
-- 3. Keep chunk_count on the parent document accurate
-- ============================================

CREATE OR REPLACE FUNCTION sync_knowledge_chunk_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  -- NEW is unassigned in a DELETE trigger, so it can't be read unconditionally
  -- (COALESCE(NEW.x, OLD.x) raises "record new is not assigned yet").
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.knowledge_id;
  ELSE
    target_id := NEW.knowledge_id;
  END IF;

  UPDATE bot_knowledge
  SET chunk_count = (
    SELECT count(*) FROM bot_knowledge_chunks WHERE knowledge_id = target_id
  )
  WHERE id = target_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chunk_count ON bot_knowledge_chunks;
CREATE TRIGGER trg_sync_chunk_count
  AFTER INSERT OR DELETE ON bot_knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION sync_knowledge_chunk_count();

-- ============================================
-- 4. Row Level Security
-- ============================================

ALTER TABLE bot_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Mirrors the bot_knowledge policy: only the bot owner touches chunks directly
DROP POLICY IF EXISTS "Chunk owner access" ON bot_knowledge_chunks;
CREATE POLICY "Chunk owner access" ON bot_knowledge_chunks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = bot_knowledge_chunks.bot_id
        AND bots.owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. Retrieval RPC
-- ============================================
-- SECURITY DEFINER so chat can retrieve knowledge for bots the caller does not
-- own (acquired from the marketplace) -- but the WHERE clause below re-implements
-- the access check by hand, since DEFINER bypasses RLS. Without that guard any
-- authenticated user could dump any bot's knowledge by guessing a bot_id.

CREATE OR REPLACE FUNCTION search_bot_knowledge(
  p_bot_id UUID,
  p_query TEXT,
  p_limit INT DEFAULT 8
)
RETURNS TABLE (
  chunk_id UUID,
  knowledge_id UUID,
  title TEXT,
  content TEXT,
  tokens INTEGER,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- The query terms are OR'ed, not AND'ed. websearch_to_tsquery/plainto_tsquery
  -- both build an AND query, which fails on ordinary questions: "como faco a
  -- troca de um produto" becomes 'fac' & 'troc' & 'produt' and matches nothing,
  -- because the document never says "faco". Extracting lexemes through
  -- to_tsvector (which stems and drops stopwords) and joining them with | lets
  -- partial matches through, and ts_rank then orders by how well each chunk
  -- actually covers the question. quote_literal keeps operator characters from
  -- reaching to_tsquery; a query of only stopwords yields NULL, which matches
  -- nothing -- the intended outcome.
  WITH q AS (
    SELECT to_tsquery('portuguese', (
      SELECT string_agg(quote_literal(lexeme), ' | ')
      FROM unnest(to_tsvector('portuguese', p_query))
    )) AS query
  )
  SELECT
    c.id,
    c.knowledge_id,
    k.title,
    c.content,
    c.tokens,
    ts_rank(c.tsv, q.query) AS rank
  FROM bot_knowledge_chunks c
  JOIN bot_knowledge k ON k.id = c.knowledge_id
  CROSS JOIN q
  WHERE c.bot_id = p_bot_id
    AND c.tsv @@ q.query
    AND EXISTS (
      SELECT 1 FROM bots b
      WHERE b.id = p_bot_id
        AND (
          b.owner_id = auth.uid()
          OR b.is_published = true
          OR EXISTS (
            SELECT 1 FROM user_bot_access a
            WHERE a.bot_id = b.id AND a.user_id = auth.uid()
          )
        )
    )
  ORDER BY rank DESC, c.chunk_index ASC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION search_bot_knowledge(UUID, TEXT, INT) FROM public;
GRANT EXECUTE ON FUNCTION search_bot_knowledge(UUID, TEXT, INT) TO authenticated;

-- ============================================
-- 6. Storage bucket for uploaded source files
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

-- Files are stored under <bot_id>/<filename>, so the first path segment
-- identifies the owning bot.
DROP POLICY IF EXISTS "Bot owners manage knowledge files" ON storage.objects;
CREATE POLICY "Bot owners manage knowledge files" ON storage.objects FOR ALL
  USING (
    bucket_id = 'knowledge-files'
    AND EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id::text = (storage.foldername(name))[1]
        AND bots.owner_id = auth.uid()
    )
  );
