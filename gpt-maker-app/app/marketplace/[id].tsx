import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Share } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useReviewStore } from '@/stores/reviewStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { ReportSheet } from '@/components/marketplace/ReportSheet';
import { botShareUrl } from '@/lib/share';
import Colors from '@/constants/Colors';
import type { Bot, MarketplaceListing, Profile } from '@/types';

type FullListing = MarketplaceListing & { bot: Bot & { owner: Profile } };

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const session = useAuthStore((s) => s.session);

  const { toggleFavorite, isFavorite, fetchFavorites, reportContent } = useMarketplaceStore();
  const { reviews, myReview, fetchReviews, submitReview } = useReviewStore();

  const [listing, setListing] = useState<FullListing | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');

  const isOwner = !!listing && listing.bot.owner_id === session?.user.id;

  useEffect(() => {
    if (!id) return;
    fetchListing();
    fetchReviews(id);
    fetchFavorites();
  }, [id]);

  useEffect(() => {
    if (myReview) {
      setDraftRating(myReview.rating);
      setDraftComment(myReview.comment ?? '');
    }
  }, [myReview]);

  const fetchListing = async () => {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*, bot:bots(*, owner:profiles(*))')
      .eq('id', id)
      .single();

    if (!data) return;
    setListing(data as FullListing);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: access } = await supabase
        .from('user_bot_access')
        .select('id')
        .eq('bot_id', (data as FullListing).bot_id)
        .eq('user_id', user.id)
        .maybeSingle();
      setHasAccess(!!access);
    }
  };

  const handleGetBot = async () => {
    if (!listing) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_bot_access').insert({
        user_id: user.id,
        bot_id: listing.bot_id,
        access_type: 'free',
      });
      // Already owned is not an error worth showing.
      if (error && error.code !== '23505') throw error;

      await supabase
        .from('marketplace_listings')
        .update({ download_count: (listing.download_count ?? 0) + 1 })
        .eq('id', listing.id);

      setHasAccess(true);
      Alert.alert('Bot adicionado!', 'Voce ja pode conversar com este bot.', [
        { text: 'Depois', style: 'cancel' },
        { text: 'Conversar', onPress: () => router.push(`/bot/${listing.bot_id}/chat` as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id || draftRating === 0) return;
    try {
      await submitReview(id, draftRating, draftComment);
      await fetchListing();
      Alert.alert('Obrigado!', 'Sua avaliacao foi registrada.');
    } catch (error: any) {
      Alert.alert('Nao foi possivel avaliar', error.message);
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    await Share.share({
      message: `Conheca "${listing.bot.name}" no GPT Maker: ${botShareUrl(listing.bot_id)}`,
    });
  };

  if (!listing) return null;
  const { bot } = listing;
  const favorited = isFavorite(bot.id);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: bot.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={handleShare} hitSlop={8}>
                <Ionicons name="share-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => toggleFavorite(bot.id).catch(() => {})}
                hitSlop={8}
              >
                <Ionicons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={22}
                  color={favorited ? Colors.brand.danger : colors.text}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Avatar uri={bot.avatar_url} name={bot.name} size={80} />
          <Text style={[styles.name, { color: colors.text }]}>{bot.name}</Text>
          <Text style={[styles.creator, { color: colors.textSecondary }]}>
            por {bot.owner?.display_name ?? bot.owner?.username}
          </Text>
          {bot.rating_count > 0 && (
            <View style={styles.headerRating}>
              <RatingStars value={Number(bot.rating_avg)} size={16} />
              <Text style={[styles.creator, { color: colors.textSecondary }]}>
                {Number(bot.rating_avg).toFixed(1)} ({bot.rating_count})
              </Text>
            </View>
          )}
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
              {bot.rating_count > 0 ? Number(bot.rating_avg).toFixed(1) : '-'}
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

        <View style={styles.actionSection}>
          {hasAccess ? (
            <Button
              title="Conversar"
              onPress={() => router.push(`/bot/${bot.id}/chat` as any)}
              size="lg"
            />
          ) : (
            <Button title="Obter Gratis" onPress={handleGetBot} loading={loading} size="lg" />
          )}
        </View>

        {/* Reviewing requires having acquired the bot, and owners can't review
            their own -- both enforced in the database as well. */}
        {hasAccess && !isOwner && (
          <Card style={styles.reviewForm}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {myReview ? 'Sua avaliacao' : 'Avaliar este bot'}
            </Text>
            <RatingStars value={draftRating} size={30} onChange={setDraftRating} />
            <Input
              placeholder="Conte como foi sua experiencia (opcional)"
              value={draftComment}
              onChangeText={setDraftComment}
              multiline
              style={{ height: 70, textAlignVertical: 'top', marginTop: 12 }}
            />
            <Button
              title={myReview ? 'Atualizar avaliacao' : 'Enviar avaliacao'}
              onPress={handleSubmitReview}
              disabled={draftRating === 0}
            />
          </Card>
        )}

        {reviews.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.reviewsHeading, { color: colors.text }]}>
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
                  <View style={styles.reviewMeta}>
                    <Text style={[styles.reviewUser, { color: colors.text }]}>
                      {review.user?.display_name ?? review.user?.username}
                    </Text>
                    <RatingStars value={review.rating} size={14} />
                  </View>
                  <Pressable onPress={() => setReporting(true)} hitSlop={8}>
                    <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
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

        <Pressable onPress={() => setReporting(true)} style={styles.reportLink}>
          <Ionicons name="flag-outline" size={15} color={colors.textSecondary} />
          <Text style={[styles.reportText, { color: colors.textSecondary }]}>
            Denunciar este bot
          </Text>
        </Pressable>
      </ScrollView>

      <ReportSheet
        visible={reporting}
        title="Denunciar"
        onClose={() => setReporting(false)}
        onSubmit={async (reason, details) => {
          try {
            await reportContent('bot', bot.id, reason, details);
            Alert.alert('Denuncia enviada', 'Obrigado. Vamos analisar o conteudo.');
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 18, marginRight: 4 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  creator: { fontSize: 14, marginTop: 2 },
  headerRating: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  description: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  actionSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  reviewsHeading: { paddingHorizontal: 20 },
  reviewForm: { marginHorizontal: 20, marginBottom: 24, gap: 4 },
  reviewCard: { marginHorizontal: 20, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewMeta: { flex: 1, gap: 3 },
  reviewUser: { fontSize: 14, fontWeight: '600' },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 28,
  },
  reportText: { fontSize: 13 },
});
