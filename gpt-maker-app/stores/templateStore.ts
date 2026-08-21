import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { BotTemplate } from '@/types';

interface TemplateState {
  templates: BotTemplate[];
  loading: boolean;
  fetchTemplates: () => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('bot_templates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      set({ templates: data ?? [] });
    } finally {
      set({ loading: false });
    }
  },
}));
