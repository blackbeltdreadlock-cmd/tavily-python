import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { RatingStars } from '@/components/marketplace/RatingStars';
import Colors from '@/constants/Colors';

export default function CreatorDashboardScreen() {
  const colors = useThemeColors();
  const { creatorStats, loading, fetchCreatorStats } = useMarketplaceStore();

  useEffect(() => {
    fetchCreatorStats();
  }, []);

  const totals = useMemo(
    () =>
      creatorStats.reduce(
        (acc, s) => ({
          bots: acc.bots + 1,
          published: acc.published + (s.is_published ? 1 : 0),
          acquisitions: acc.acquisitions + Number(s.acquisitions),
          conversations: acc.conversations + Number(s.conversations),
        }),
        { bots: 0, published: 0, acquisitions: 0, conversations: 0 },
      ),
    [creatorStats],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Painel do Criador',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={creatorStats}
          keyExtractor={(item) => item.bot_id}
          refreshing={loading}
          onRefresh={fetchCreatorStats}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.summary}>
              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: Colors.brand.primary }]}>
                  {totals.published}/{totals.bots}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Publicados
                </Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: Colors.brand.primary }]}>
                  {totals.acquisitions}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Aquisicoes
                </Text>
              </Card>
              <Card style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: Colors.brand.primary }]}>
                  {totals.conversations}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Conversas
                </Text>
              </Card>
            </View>
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push(`/bot/${item.bot_id}` as any)}
              style={styles.botCard}
            >
              <View style={styles.botRow}>
                <Avatar uri={item.avatar_url} name={item.name} size={44} />
                <View style={styles.botInfo}>
                  <View style={styles.botHeader}>
                    <Text style={[styles.botName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.is_published && (
                      <Ionicons name="checkmark-circle" size={15} color={Colors.brand.success} />
                    )}
                  </View>
                  <View style={styles.botMetrics}>
                    <Text style={[styles.metric, { color: colors.textSecondary }]}>
                      {item.acquisitions} aquisicoes
                    </Text>
                    <Text style={[styles.metric, { color: colors.textSecondary }]}>
                      {item.conversations} conversas
                    </Text>
                  </View>
                  {item.rating_count > 0 ? (
                    <View style={styles.ratingRow}>
                      <RatingStars value={Number(item.rating_avg)} size={13} />
                      <Text style={[styles.metric, { color: colors.textSecondary }]}>
                        {Number(item.rating_avg).toFixed(1)} ({item.rating_count})
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.metric, { color: colors.textSecondary }]}>
                      Sem avaliacoes ainda
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="stats-chart-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Crie e publique um bot para ver metricas aqui
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  botCard: { marginBottom: 10 },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botInfo: { flex: 1 },
  botHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  botMetrics: { flexDirection: 'row', gap: 14, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metric: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, marginTop: 16, textAlign: 'center', paddingHorizontal: 40 },
});
