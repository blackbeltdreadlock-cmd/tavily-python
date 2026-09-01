import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { BotVersion } from '@/types';

interface VersionState {
  versions: BotVersion[];
  loading: boolean;

  fetchVersions: (botId: string) => Promise<void>;
  createVersion: (botId: string) => Promise<BotVersion>;
  rollbackToVersion: (botId: string, versionNumber: number) => Promise<void>;
}

export const useVersionStore = create<VersionState>((set) => ({
  versions: [],
  loading: false,

  fetchVersions: async (botId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('bot_versions')
        .select('*')
        .eq('bot_id', botId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      set({ versions: data ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  createVersion: async (botId) => {
    const { data, error } = await supabase.rpc('create_bot_version', { p_bot_id: botId });
    if (error) throw error;

    set((state) => ({
      versions: [data, ...state.versions],
    }));

    return data as BotVersion;
  },

  rollbackToVersion: async (botId, versionNumber) => {
    const { error } = await supabase.rpc('rollback_to_version', {
      p_bot_id: botId,
      p_version_number: versionNumber,
    });
    if (error) throw error;

    await set((state) => ({
      versions: state.versions,
    }));
  },
}));
