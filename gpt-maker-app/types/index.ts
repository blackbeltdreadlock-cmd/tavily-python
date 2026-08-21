export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_creator: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bot {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string;
  welcome_message: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  is_public: boolean;
  is_published: boolean;
  category: string | null;
  tags: string[];
  total_conversations: number;
  total_messages: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface BotKnowledge {
  id: string;
  bot_id: string;
  title: string;
  content: string;
  content_type: 'text' | 'url' | 'file';
  source_url: string | null;
  file_path: string | null;
  tokens: number;
  status: 'processing' | 'ready' | 'error';
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

export interface BotKnowledgeChunk {
  id: string;
  knowledge_id: string;
  bot_id: string;
  chunk_index: number;
  content: string;
  tokens: number;
  created_at: string;
}

/** Shape returned by the `search_bot_knowledge` RPC. */
export interface KnowledgeSearchResult {
  chunk_id: string;
  knowledge_id: string;
  title: string;
  content: string;
  tokens: number;
  rank: number;
}

export interface Conversation {
  id: string;
  bot_id: string;
  user_id: string;
  title: string | null;
  is_active: boolean;
  message_count: number;
  created_at: string;
  updated_at: string;
  bot?: Bot;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  bot_id: string;
  price_type: 'free' | 'one_time' | 'subscription';
  price_amount: number;
  currency: string;
  is_featured: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  bot?: Bot;
}

export interface Review {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Profile;
}

export interface UserBotAccess {
  id: string;
  user_id: string;
  bot_id: string;
  access_type: 'purchased' | 'subscribed' | 'free';
  expires_at: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  bot_id: string;
  created_at: string;
  bot?: Bot;
}

export type ReportTarget = 'bot' | 'review';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: string;
}

/** Shape returned by the `creator_stats` RPC. */
export interface CreatorStat {
  bot_id: string;
  name: string;
  avatar_url: string | null;
  is_published: boolean;
  acquisitions: number;
  conversations: number;
  rating_avg: number;
  rating_count: number;
}

export type MarketplaceSort = 'popular' | 'recent' | 'rating';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  bot_count: number;
  sort_order: number;
}

export type BotCreateInput = Pick<Bot, 'name' | 'description' | 'system_prompt' | 'welcome_message' | 'model' | 'temperature' | 'max_tokens' | 'category' | 'tags'> & {
  avatar_url?: string;
};
