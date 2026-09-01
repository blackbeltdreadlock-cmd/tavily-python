import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Profile, Review } from '@/types';

type ReviewWithUser = Review & { user?: Profile };

interface ReviewState {
  reviews: ReviewWithUser[];
  myReview: ReviewWithUser | null;
  loading: boolean;

  fetchReviews: (listingId: string) => Promise<void>;
  submitReview: (listingId: string, rating: number, comment?: string) => Promise<void>;
  deleteMyReview: (listingId: string) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  myReview: null,
  loading: false,

  fetchReviews: async (listingId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, user:profiles(id, username, display_name, avatar_url)')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      const rows = (data ?? []) as ReviewWithUser[];

      set({
        reviews: rows,
        myReview: user ? rows.find((r) => r.user_id === user.id) ?? null : null,
      });
    } finally {
      set({ loading: false });
    }
  },

  submitReview: async (listingId, rating, comment) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // One review per user per listing -- upsert so editing reuses the same row
    // and the rating trigger recomputes instead of double counting.
    const { error } = await supabase
      .from('reviews')
      .upsert(
        {
          listing_id: listingId,
          user_id: user.id,
          rating,
          comment: comment?.trim() || null,
        },
        { onConflict: 'listing_id,user_id' },
      );

    if (error) throw error;
    await get().fetchReviews(listingId);
  },

  deleteMyReview: async (listingId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('listing_id', listingId)
      .eq('user_id', user.id);

    if (error) throw error;
    await get().fetchReviews(listingId);
  },
}));
