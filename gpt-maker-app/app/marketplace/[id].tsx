import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { MarketplaceListing, Bot, Review, Profile } from '@/types';
import Colors from '@/constants/Colors';

type FullListing = MarketplaceListing & {
  bot: Bot & { owner: Profile };
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const [listing, setListing] = useState<FullListing | null>(null);
  const [reviews, setReviews] = useState<(Review & { user: Profile })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
      fetchReviews();
    }
  }, [id]);

  const fetchListing = async () => {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*, bot:bots(*, owner:profiles(*))')
      .eq('id', id)
      .single();
    if (data) setListing(data as FullListing);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, user:profiles(username, display_name, avatar_url)')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setReviews(data as any);
  };

  const handleGetBot = async () => {
    if (!listing) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('user_bot_access').insert({
        user_id: user.id,
        bot_id: listing.bot_id,
        access_type: listing.price_type === 'free' ? 'free' : 'purchased',
      });

      await supabase
        .from('marketplace_listings')
        .update({ download_count: (listing.download_count ?? 0) + 1 })
        .eq('id', listing.id);

      Alert.alert('Bot adicionado!', 'Voce ja pode conversar com este bot.', [
        { text: 'Conversar', onPress: () => router.push(`/bot/${listing.bot_id}/chat` as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!listing) return null;

  const { bot } = listing;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: bot.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Avatar uri={bot.avatar_url} name={bot.name} size={80} />
          <Text style={[styles.name, { color: colors.text }]}>{bot.name}</Text>
          <Text style={[styles.creator, { color: colors.textSecondary }]}>
            por {bot.owner?.display_name ?? bot.owner?.username}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {bot.description}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{listing.download_count}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Downloads</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {bot.rating_avg > 0 ? bot.rating_avg.toFixed(1) : '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avaliacao</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {bot.total_conversations}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conversas</Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <Text style={[styles.price, { color: Colors.brand.primary }]}>
            {listing.price_type === 'free'
              ? 'Gratis'
              : `R$ ${listing.price_amount.toFixed(2)}`}
          </Text>
          <Button
            title={listing.price_type === 'free' ? 'Obter Gratis' : 'Comprar'}
            onPress={handleGetBot}
            loading={loading}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>

        {reviews.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Avaliacoes ({reviews.length})
            </Text>
            {reviews.map((review) => (
              <Card key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Avatar
                    uri={review.user?.avatar_url}
                    name={review.user?.display_name ?? review.user?.username}
                    size={32}
                  />
                  <View>
                    <Text style={[styles.reviewUser, { color: colors.text }]}>
                      {review.user?.display_name ?? review.user?.username}
                    </Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color="#fdcb6e"
                        />
                      ))}
                    </View>
                  </View>
                </View>
                {review.comment && (
                  <Text style={[styles.reviewComment, { color: colors.text }]}>
                    {review.comment}
                  </Text>
                )}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  creator: { fontSize: 14, marginTop: 2 },
  description: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  price: { fontSize: 24, fontWeight: '800' },
  sectionTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
  reviewCard: { marginHorizontal: 20, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewUser: { fontSize: 14, fontWeight: '600' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
});
