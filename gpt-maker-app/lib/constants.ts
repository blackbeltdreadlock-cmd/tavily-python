export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const AI_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Rapido e inteligente' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Ultra-rapido, economico' },
] as const;

export const BOT_CATEGORIES = [
  { slug: 'assistente', name: 'Assistente', icon: 'robot' },
  { slug: 'educacao', name: 'Educacao', icon: 'school' },
  { slug: 'criatividade', name: 'Criatividade', icon: 'palette' },
  { slug: 'negocios', name: 'Negocios', icon: 'briefcase' },
  { slug: 'programacao', name: 'Programacao', icon: 'code' },
  { slug: 'saude', name: 'Saude', icon: 'heart' },
  { slug: 'entretenimento', name: 'Entretenimento', icon: 'gamepad' },
  { slug: 'produtividade', name: 'Produtividade', icon: 'zap' },
] as const;

export const DEFAULT_BOT_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  max_tokens: 2048,
  system_prompt: '',
  welcome_message: 'Ola! Como posso ajudar voce hoje?',
};
