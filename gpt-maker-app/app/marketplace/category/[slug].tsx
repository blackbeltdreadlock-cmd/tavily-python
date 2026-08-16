import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { BotCard } from '@/components/bot/BotCard';
import { BOT_CATEGORIES } from '@/lib/constants';
import type { Bot } from '@/types';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useThemeColors();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);

  const category = BOT_CATEGORIES.find((c) => c.slug === slug);

  useEffect(() => {
    if (slug) fetchBots();
  }, [slug]);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bots')
        .select('*')
        .eq('category', slug)
        .eq('is_published', true)
        .order('rating_avg', { ascending: false });
      setBots(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: category?.name ?? 'Categoria',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={bots}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BotCard bot={item} onPress={() => router.push(`/bot/${item.id}` as any)} />
          )}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchBots}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum bot nesta categoria ainda
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, marginTop: 16 },
});
