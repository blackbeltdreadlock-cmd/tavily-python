import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { BotCard } from '@/components/bot/BotCard';
import Colors from '@/constants/Colors';

export default function MyBotsScreen() {
  const colors = useThemeColors();
  const { bots, loading, fetchMyBots } = useBotStore();

  useFocusEffect(
    useCallback(() => {
      fetchMyBots();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={bots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BotCard
            bot={item}
            onPress={() => router.push(`/bot/${item.id}` as any)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchMyBots}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum bot ainda</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Crie seu primeiro chatbot com IA
            </Text>
          </View>
        }
      />
      <Pressable
        onPress={() => router.push('/bot/create')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 15, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
