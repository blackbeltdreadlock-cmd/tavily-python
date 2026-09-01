import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { profile, session, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Avatar uri={profile?.avatar_url} name={profile?.display_name ?? profile?.username} size={80} />
        <Text style={[styles.name, { color: colors.text }]}>
          {profile?.display_name ?? profile?.username ?? 'Usuario'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {session?.user.email}
        </Text>
        {profile?.bio && (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Card style={styles.menuItem}>
          <View style={styles.menuRow}>
            <Ionicons name="person-outline" size={22} color={colors.tint} />
            <Text style={[styles.menuText, { color: colors.text }]}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>
        <Card style={styles.menuItem}>
          <View style={styles.menuRow}>
            <Ionicons name="key-outline" size={22} color={colors.tint} />
            <Text style={[styles.menuText, { color: colors.text }]}>Chaves de API</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>
        <Card style={styles.menuItem} onPress={() => router.push('/creator/favorites' as any)}>
          <View style={styles.menuRow}>
            <Ionicons name="heart-outline" size={22} color={colors.tint} />
            <Text style={[styles.menuText, { color: colors.text }]}>Favoritos</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>
        <Card style={styles.menuItem} onPress={() => router.push('/creator/dashboard' as any)}>
          <View style={styles.menuRow}>
            <Ionicons name="stats-chart-outline" size={22} color={colors.tint} />
            <Text style={[styles.menuText, { color: colors.text }]}>Painel do Criador</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>
        <Card style={styles.menuItem}>
          <View style={styles.menuRow}>
            <Ionicons name="settings-outline" size={22} color={colors.tint} />
            <Text style={[styles.menuText, { color: colors.text }]}>Configuracoes</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </Card>
      </View>

      <View style={styles.logout}>
        <Button title="Sair da Conta" onPress={handleSignOut} variant="outline" size="lg" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  name: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  email: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  section: { paddingHorizontal: 20, gap: 8 },
  menuItem: { paddingVertical: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '500' },
  logout: { paddingHorizontal: 20, paddingVertical: 32 },
});
