-- GPT Maker Platform - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Bots
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  welcome_message TEXT,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  is_public BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bot Knowledge Base
CREATE TABLE bot_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  source_url TEXT,
  file_path TEXT,
  tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Marketplace Listings
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL UNIQUE,
  price_type TEXT DEFAULT 'free' CHECK (price_type IN ('free', 'one_time', 'subscription')),
  price_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  is_featured BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- User Bot Access (purchases/subscriptions)
CREATE TABLE user_bot_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  access_type TEXT DEFAULT 'purchased' CHECK (access_type IN ('purchased', 'subscribed', 'free')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bot_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  bot_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_bots_owner ON bots(owner_id);
CREATE INDEX idx_bots_category ON bots(category);
CREATE INDEX idx_bots_published ON bots(is_published) WHERE is_published = true;
CREATE INDEX idx_conversations_bot ON conversations(bot_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_marketplace_bot ON marketplace_listings(bot_id);
CREATE INDEX idx_user_access_user ON user_bot_access(user_id);
CREATE INDEX idx_user_access_bot ON user_bot_access(bot_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bot_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Bots: owners full access, others can read public/published
CREATE POLICY "Bot owners have full access" ON bots FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Published bots are viewable" ON bots FOR SELECT USING (is_published = true OR is_public = true);

-- Bot Knowledge: only bot owner
CREATE POLICY "Knowledge owner access" ON bot_knowledge FOR ALL
  USING (EXISTS (SELECT 1 FROM bots WHERE bots.id = bot_knowledge.bot_id AND bots.owner_id = auth.uid()));

-- Conversations: participants only
CREATE POLICY "Conversation participants" ON conversations FOR ALL
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM bots WHERE bots.id = conversations.bot_id AND bots.owner_id = auth.uid()));
CREATE POLICY "Create conversation" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages: conversation participants
CREATE POLICY "Message access" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Insert messages" ON messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

-- Marketplace: everyone reads, bot owner manages
CREATE POLICY "Listings are viewable" ON marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Bot owner manages listing" ON marketplace_listings FOR ALL
  USING (EXISTS (SELECT 1 FROM bots WHERE bots.id = marketplace_listings.bot_id AND bots.owner_id = auth.uid()));

-- Reviews: everyone reads, authenticated users create own
CREATE POLICY "Reviews are viewable" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- User bot access: user sees own
CREATE POLICY "Users see own access" ON user_bot_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own access" ON user_bot_access FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories: everyone reads
CREATE POLICY "Categories are viewable" ON categories FOR SELECT USING (true);

-- ============================================
-- Enable Realtime for messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- Seed categories
-- ============================================
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Assistente', 'assistente', 'robot', 1),
  ('Educacao', 'educacao', 'school', 2),
  ('Criatividade', 'criatividade', 'palette', 3),
  ('Negocios', 'negocios', 'briefcase', 4),
  ('Programacao', 'programacao', 'code', 5),
  ('Saude', 'saude', 'heart', 6),
  ('Entretenimento', 'entretenimento', 'gamepad', 7),
  ('Produtividade', 'produtividade', 'zap', 8);
