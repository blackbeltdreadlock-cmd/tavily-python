import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Bot, BotCreateInput } from '@/types';

interface BotState {
  bots: Bot[];
  selectedBot: Bot | null;
  loading: boolean;

  fetchMyBots: () => Promise<void>;
  fetchBot: (id: string) => Promise<Bot | null>;
  createBot: (input: BotCreateInput) => Promise<Bot>;
  updateBot: (id: string, updates: Partial<Bot>) => Promise<void>;
  deleteBot: (id: string) => Promise<void>;
  setSelectedBot: (bot: Bot | null) => void;
}

export const useBotStore = create<BotState>((set, get) => ({
  bots: [],
  selectedBot: null,
  loading: false,

  fetchMyBots: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ bots: data ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchBot: async (id) => {
    const { data, error } = await supabase
      .from('bots')
      .select('*, owner:profiles(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  createBot: async (input) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bots')
      .insert({ ...input, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;

    set((state) => ({ bots: [data, ...state.bots] }));
    return data;
  },

  updateBot: async (id, updates) => {
    const { data, error } = await supabase
      .from('bots')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    set((state) => ({
      bots: state.bots.map((b) => (b.id === id ? data : b)),
      selectedBot: state.selectedBot?.id === id ? data : state.selectedBot,
    }));
  },

  deleteBot: async (id) => {
    const { error } = await supabase.from('bots').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      bots: state.bots.filter((b) => b.id !== id),
      selectedBot: state.selectedBot?.id === id ? null : state.selectedBot,
    }));
  },

  setSelectedBot: (bot) => set({ selectedBot: bot }),
}));
