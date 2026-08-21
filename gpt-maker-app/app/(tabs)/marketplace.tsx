import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { BotCard } from '@/components/bot/BotCard';
import { SortBar } from '@/components/marketplace/SortBar';
import { BOT_CATEGORIES } from '@/lib/constants';
import Colors from '@/constants/Colors';
import type { Bot, MarketplaceListing, MarketplaceSort } from '@/types';

type ListingWithBot = MarketplaceListing & { bot: Bot };

export default function MarketplaceScreen() {
  const colors = useThemeColors();
  const [listings, setListings] = useState<ListingWithBot[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MarketplaceSort>('popular');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      // `bots!inner` matters: with a plain embed, PostgREST applies the filter to
      // the embedded resource only and still returns every parent row (with a
      // null embed). !inner propagates the filter to the listings themselves.
      let query = supabase
        .from('marketplace_listings')
        .select('*, bot:bots!inner(*, owner:profiles(username, display_name, avatar_url))');

      const term = search.trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`, {
          referencedTable: 'bot',
        });
      }

      if (category) {
        query = query.eq('bot.category', category);
      }

      if (sort === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sort === 'rating') {
        query = query.order('rating_avg', { referencedTable: 'bot', ascending: false });
      } else {
        query = query
          .order('is_featured', { ascending: false })
          .order('download_count', { ascending: false });
      }

      const { data } = await query;
      // Defensive: a listing whose bot was removed would break BotCard.
      setListings(((data as ListingWithBot[] | null) ?? []).filter((l) => l.bot));
    } finally {
      setLoading(false);
    }
  }, [search, sort, category]);

  useEffect(() => {
    const timeout = setTimeout(fetchListings, search ? 400 : 0);
    return () => clearTimeout(timeout);
  }, [fetchListings]);

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
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </Pressable>
        )}
      </View>

      <SortBar value={sort} onChange={setSort} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <Pressable
          onPress={() => setCategory(null)}
          style={[
            styles.categoryChip,
            {
              backgroundColor: !category ? Colors.brand.accent : colors.inputBackground,
              borderColor: !category ? Colors.brand.accent : colors.border,
            },
          ]}
        >
          <Text style={[styles.categoryText, { color: !category ? '#fff' : colors.textSecondary }]}>
            Todas
          </Text>
        </Pressable>
        {BOT_CATEGORIES.map((cat) => {
          const active = category === cat.slug;
          return (
            <Pressable
              key={cat.slug}
              onPress={() => setCategory(active ? null : cat.slug)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? Colors.brand.accent : colors.inputBackground,
                  borderColor: active ? Colors.brand.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.categoryText, { color: active ? '#fff' : colors.textSecondary }]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BotCard bot={item.bot} onPress={() => router.push(`/marketplace/${item.id}` as any)} />
        )}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchListings}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {search || category ? 'Nada encontrado' : 'Marketplace vazio'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search || category
                  ? 'Tente outra busca ou categoria'
                  : 'Seja o primeiro a publicar um bot!'}
              </Text>
            </View>
          ) : null
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
  categoryRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  categoryChip: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1 },
  categoryText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 15, marginTop: 4 },
});
