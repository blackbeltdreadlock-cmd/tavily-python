import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
  owner_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bot_count: number;
  total_conversations: number;
  rating_avg: number;
  top_bot_name: string | null;
}

export interface TrendingCreator {
  owner_id: string;
  display_name: string | null;
  avatar_url: string | null;
  new_conversations: number;
  new_ratings: number;
}

interface AnalyticsState {
  leaderboard: LeaderboardEntry[];
  trending: TrendingCreator[];
  loading: boolean;
  lastUpdated: number | null;

  fetchLeaderboard: (sortBy: 'rating' | 'downloads' | 'trending', limit?: number) => Promise<void>;
  fetchTrendingCreators: (days?: number) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  leaderboard: [],
  trending: [],
  loading: false,
  lastUpdated: null,

  fetchLeaderboard: async (sortBy, limit = 50) => {
    const state = get();
    if (state.lastUpdated && Date.now() - state.lastUpdated < CACHE_DURATION) {
      return;
    }

    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_sort_by: sortBy,
        p_limit: limit,
      });

      if (error) throw error;
      set({ leaderboard: data ?? [], lastUpdated: Date.now() });
    } finally {
      set({ loading: false });
    }
  },

  fetchTrendingCreators: async (days = 7) => {
    const state = get();
    if (state.lastUpdated && Date.now() - state.lastUpdated < CACHE_DURATION) {
      return;
    }

    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_trending_creators', {
        p_days: days,
      });

      if (error) throw error;
      set({ trending: data ?? [], lastUpdated: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
}));
