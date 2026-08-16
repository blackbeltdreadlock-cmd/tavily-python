import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { BotCard } from '@/components/bot/BotCard';
import type { Bot, MarketplaceListing } from '@/types';

type ListingWithBot = MarketplaceListing & { bot: Bot };

export default function MarketplaceScreen() {
  const colors = useThemeColors();
  const [listings, setListings] = useState<ListingWithBot[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*, bot:bots(*, owner:profiles(username, display_name, avatar_url))')
        .order('download_count', { ascending: false });

      if (search.trim()) {
        query = query.ilike('bot.name', `%${search.trim()}%`);
      }

      const { data } = await query;
      setListings((data as ListingWithBot[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchListings, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={20} color={colors.placeholder} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar bots..."
          placeholderTextColor={colors.placeholder}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BotCard
            bot={item.bot}
            onPress={() => router.push(`/marketplace/${item.id}` as any)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchListings}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Marketplace vazio</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Seja o primeiro a publicar um bot!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  list: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 15, marginTop: 4 },
});
