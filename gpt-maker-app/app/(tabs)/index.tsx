import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { BOT_CATEGORIES } from '@/lib/constants';
import Colors from '@/constants/Colors';

export default function HomeScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          Ola, {profile?.display_name ?? profile?.username ?? 'usuario'}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>
          O que vamos criar hoje?
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/bot/create')}
        style={({ pressed }) => [styles.createBanner, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.bannerContent}>
          <Ionicons name="add-circle" size={32} color="#fff" />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Criar Novo Bot</Text>
            <Text style={styles.bannerSubtitle}>Configure seu chatbot com IA em minutos</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorias</Text>
      <View style={styles.categoriesGrid}>
        {BOT_CATEGORIES.map((cat) => (
          <Card
            key={cat.slug}
            onPress={() => router.push(`/marketplace/category/${cat.slug}` as any)}
            style={styles.categoryCard}
          >
            <Ionicons
              name={getCategoryIcon(cat.icon)}
              size={28}
              color={Colors.brand.primary}
            />
            <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
          </Card>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Destaques</Text>
      <Card style={styles.featuredCard}>
        <Text style={[styles.featuredText, { color: colors.textSecondary }]}>
          Em breve: bots em destaque no marketplace
        </Text>
      </Card>
    </ScrollView>
  );
}

function getCategoryIcon(icon: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    robot: 'hardware-chip',
    school: 'school',
    palette: 'color-palette',
    briefcase: 'briefcase',
    code: 'code-slash',
    heart: 'heart',
    gamepad: 'game-controller',
    zap: 'flash',
  };
  return map[icon] ?? 'cube';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary,
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  bannerText: { flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 4,
  },
  categoryName: { fontSize: 14, fontWeight: '500', marginTop: 8 },
  featuredCard: { marginHorizontal: 20, marginBottom: 32 },
  featuredText: { textAlign: 'center', fontSize: 14 },
});
