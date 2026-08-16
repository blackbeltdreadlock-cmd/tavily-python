import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, initialized: true });

    if (session) {
      await get().fetchProfile();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session) {
        await get().fetchProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  signUp: async (email, password, username) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, username, display_name: username });
        if (profileError) throw profileError;
      }
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) set({ profile: data });
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    if (data) set({ profile: data });
  },
}));
