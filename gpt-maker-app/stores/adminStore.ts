import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface AdminStats {
  total_bots: number;
  total_users: number;
  total_conversations: number;
  avg_rating: number;
}

export interface PendingReport {
  id: string;
  reporter_id: string;
  target_type: 'bot' | 'review';
  target_id: string;
  reason: string;
  details: string | null;
  bot_name: string | null;
  created_at: string;
}

interface AdminState {
  stats: AdminStats | null;
  reports: PendingReport[];
  loading: boolean;
  isAdmin: boolean;

  fetchAdminStats: () => Promise<void>;
  fetchPendingReports: (limit?: number, offset?: number) => Promise<void>;
  dismissReport: (reportId: string) => Promise<void>;
  banBot: (botId: string, reason: string) => Promise<void>;
  checkAdminAccess: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  reports: [],
  loading: false,
  isAdmin: false,

  checkAdminAccess: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();

      if (!error && profile) {
        set({ isAdmin: profile.is_admin });
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    }
  },

  fetchAdminStats: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('admin_stats');

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        set({
          stats: {
            total_bots: data[0].total_bots || 0,
            total_users: data[0].total_users || 0,
            total_conversations: data[0].total_conversations || 0,
            avg_rating: data[0].avg_rating || 0,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchPendingReports: async (limit = 20, offset = 0) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('list_pending_reports', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      set({ reports: data ?? [] });
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      set({ loading: false });
    }
  },

  dismissReport: async (reportId) => {
    try {
      const { error } = await supabase.rpc('admin_dismiss_report', {
        p_report_id: reportId,
      });

      if (error) throw error;

      set((state) => ({
        reports: state.reports.filter((r) => r.id !== reportId),
      }));
    } catch (error) {
      console.error('Error dismissing report:', error);
      throw error;
    }
  },

  banBot: async (botId, reason) => {
    try {
      const { error } = await supabase.rpc('admin_ban_bot', {
        p_bot_id: botId,
        p_reason: reason,
      });

      if (error) throw error;

      set((state) => ({
        reports: state.reports.filter((r) => r.target_id !== botId),
      }));
    } catch (error) {
      console.error('Error banning bot:', error);
      throw error;
    }
  },
}));
