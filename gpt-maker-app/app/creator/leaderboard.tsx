import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/Colors';
import type { LeaderboardEntry } from '@/stores/analyticsStore';

type SortType = 'rating' | 'downloads' | 'trending';

export default function LeaderboardScreen() {
  const colors = useThemeColors();
  const { leaderboard, trending, loading, fetchLeaderboard, fetchTrendingCreators } = useAnalyticsStore();
  const [sortBy, setSortBy] = useState<SortType>('rating');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [sortBy]);

  const loadData = async () => {
    if (sortBy === 'trending') {
      await fetchTrendingCreators(7);
    } else {
      await fetchLeaderboard(sortBy, 100);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const displayData = sortBy === 'trending' ? trending.map((t, i) => ({
    owner_id: t.owner_id,
    display_name: t.display_name,
    avatar_url: t.avatar_url,
    bot_count: 0,
    total_conversations: t.new_conversations,
    rating_avg: 0,
    top_bot_name: `${t.new_ratings} ratings`,
  })) : leaderboard;

  const sortLabel = sortBy === 'rating' ? 'Rating' : sortBy === 'downloads' ? 'Downloads' : 'Trending';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ranking de Criadores',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.sortBar}>
          {(['rating', 'downloads', 'trending'] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setSortBy(type)}
              style={[
                styles.sortButton,
                sortBy === type && { borderBottomColor: Colors.brand.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text style={[styles.sortText, { color: sortBy === type ? Colors.brand.primary : colors.textSecondary }]}>
                {type === 'rating' ? 'Rating' : type === 'downloads' ? 'Downloads' : 'Trending'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && !isRefreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
          </View>
        ) : displayData.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum criador encontrado</Text>
          </View>
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={(item) => item.owner_id}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <Card style={styles.creatorCard}>
                <View style={styles.cardContent}>
                  <View style={styles.rank}>
                    <Text style={[styles.rankNumber, { color: Colors.brand.primary }]}>#{index + 1}</Text>
                  </View>

                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.border }]}>
                      <Ionicons name="person-circle" size={48} color={colors.textSecondary} />
                    </View>
                  )}

                  <View style={styles.creatorInfo}>
                    <Text style={[styles.creatorName, { color: colors.text }]} numberOfLines={1}>
                      {item.display_name || 'Anônimo'}
                    </Text>
                    {item.top_bot_name && (
                      <Text style={[styles.topBot, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.top_bot_name}
                      </Text>
                    )}
                  </View>

                  <View style={styles.stats}>
                    {sortBy === 'rating' ? (
                      <>
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: colors.text }]}>
                            {item.rating_avg.toFixed(1)}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>⭐</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: colors.text }]}>
                            {item.total_conversations}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>conversas</Text>
                        </View>
                      </>
                    ) : sortBy === 'downloads' ? (
                      <>
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: colors.text }]}>
                            {item.total_conversations}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>conversas</Text>
                        </View>
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: colors.text }]}>
                            {item.bot_count}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>bots</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.stat}>
                          <Text style={[styles.statValue, { color: colors.text }]}>
                            {item.total_conversations}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>esta semana</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  sortText: { fontSize: 14, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 40 },
  creatorCard: { marginBottom: 12, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  rank: { width: 40, alignItems: 'center' },
  rankNumber: { fontSize: 18, fontWeight: '700' },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  creatorInfo: { flex: 1 },
  creatorName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  topBot: { fontSize: 12 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
});
