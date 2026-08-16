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
  created_at: string;
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
