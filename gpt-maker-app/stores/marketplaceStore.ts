import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Bot, CreatorStat, ReportTarget } from '@/types';

interface MarketplaceState {
  favoriteIds: Set<string>;
  favorites: Bot[];
  creatorStats: CreatorStat[];
  loading: boolean;

  publishBot: (botId: string, category?: string, tags?: string[]) => Promise<void>;
  unpublishBot: (botId: string) => Promise<void>;

  fetchFavorites: () => Promise<void>;
  toggleFavorite: (botId: string) => Promise<void>;
  isFavorite: (botId: string) => boolean;

  fetchCreatorStats: () => Promise<void>;
  reportContent: (
    targetType: ReportTarget,
    targetId: string,
    reason: string,
    details?: string,
  ) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  favoriteIds: new Set(),
  favorites: [],
  creatorStats: [],
  loading: false,

  publishBot: async (botId, category, tags) => {
    const { error } = await supabase.rpc('publish_bot', {
      p_bot_id: botId,
      p_category: category ?? null,
      p_tags: tags ?? null,
    });
    if (error) throw error;
  },

  unpublishBot: async (botId) => {
    const { error } = await supabase.rpc('unpublish_bot', { p_bot_id: botId });
    if (error) throw error;
  },

  fetchFavorites: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('bot_id, bot:bots(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      set({
        favoriteIds: new Set(rows.map((r: any) => r.bot_id)),
        // A favorited bot can be unpublished or deleted later; drop the blanks.
        favorites: rows.map((r: any) => r.bot).filter(Boolean),
      });
    } finally {
      set({ loading: false });
    }
  },

  toggleFavorite: async (botId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const isFav = get().favoriteIds.has(botId);

    // Optimistic: the star should respond immediately, not after a round trip.
    set((state) => {
      const next = new Set(state.favoriteIds);
      if (isFav) next.delete(botId);
      else next.add(botId);
      return { favoriteIds: next };
    });

    const { error } = isFav
      ? await supabase.from('favorites').delete().eq('bot_id', botId).eq('user_id', user.id)
      : await supabase.from('favorites').insert({ bot_id: botId, user_id: user.id });

    if (error) {
      // Roll the optimistic flip back.
      set((state) => {
        const next = new Set(state.favoriteIds);
        if (isFav) next.add(botId);
        else next.delete(botId);
        return { favoriteIds: next };
      });
      throw error;
    }
  },

  isFavorite: (botId) => get().favoriteIds.has(botId),

  fetchCreatorStats: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('creator_stats');
      if (error) throw error;
      set({ creatorStats: data ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  reportContent: async (targetType, targetId, reason, details) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details ?? null,
    });

    // A repeat report of the same thing isn't an error worth surfacing.
    if (error && error.code !== '23505') throw error;
  },
}));
