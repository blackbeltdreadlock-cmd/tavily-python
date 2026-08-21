import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { BotCard } from '@/components/bot/BotCard';

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const { favorites, loading, fetchFavorites } = useMarketplaceStore();

  useEffect(() => {
    fetchFavorites();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Favoritos',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchFavorites}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <BotCard bot={item} onPress={() => router.push(`/bot/${item.id}` as any)} />
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum favorito ainda
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
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, marginTop: 16 },
});
