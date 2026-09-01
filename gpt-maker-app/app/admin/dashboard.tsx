import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useAdminStore } from '@/stores/adminStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Colors from '@/constants/Colors';

export default function AdminDashboardScreen() {
  const colors = useThemeColors();
  const { stats, reports, loading, isAdmin, fetchAdminStats, fetchPendingReports, dismissReport, banBot, checkAdminAccess } = useAdminStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(() => {
    checkAdminAccess();
  });

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    await Promise.all([fetchAdminStats(), fetchPendingReports(30)]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleDismiss = (reportId: string) => {
    Alert.alert('Descartar relatório', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          try {
            await dismissReport(reportId);
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  const handleBan = (botId: string, botName: string) => {
    Alert.alert('Banir bot', `Banir "${botName}" permanentemente?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Banir',
        style: 'destructive',
        onPress: async () => {
          try {
            await banBot(botId, 'Violação de políticas da plataforma');
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.center}>
            <Ionicons name="lock-closed" size={64} color={colors.textSecondary} />
            <Text style={[styles.errorText, { color: colors.text }]}>Acesso restrito</Text>
            <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>Apenas administradores podem acessar</Text>
          </View>
        </View>
      </>
    );
  }

  const renderContent = () => (
    <>
      {/* Stats Grid */}
      {stats && (
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_bots}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bots</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_users}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Usuários</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_conversations}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conversas</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.avg_rating.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating médio</Text>
          </Card>
        </View>
      )}

      {/* Reports Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Relatórios Abertos</Text>
          <View style={[styles.badge, { backgroundColor: reports.length > 0 ? '#ff4444' : '#888' }]}>
            <Text style={styles.badgeText}>{reports.length}</Text>
          </View>
        </View>

        {loading && !isRefreshing ? (
          <ActivityIndicator size="large" color={Colors.brand.primary} style={styles.centered} />
        ) : reports.length === 0 ? (
          <View style={styles.emptyReports}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.brand.primary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum relatório aberto</Text>
          </View>
        ) : (
          reports.map((item) => (
            <Card key={item.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportReason, { color: colors.text }]}>{item.reason}</Text>
                  {item.bot_name && (
                    <Text style={[styles.reportBot, { color: colors.textSecondary }]}>Bot: {item.bot_name}</Text>
                  )}
                  <Text style={[styles.reportTime, { color: colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.reportActions}>
                  <Pressable onPress={() => handleDismiss(item.id)} style={styles.actionButton}>
                    <Ionicons name="checkmark" size={20} color={Colors.brand.primary} />
                  </Pressable>
                  {item.target_type === 'bot' && (
                    <Pressable onPress={() => handleBan(item.target_id, item.bot_name || 'Unknown')} style={styles.actionButton}>
                      <Ionicons name="ban" size={20} color="#ff4444" />
                    </Pressable>
                  )}
                </View>
              </View>
              {item.details && (
                <Text style={[styles.reportDetails, { color: colors.textSecondary }]}>
                  {item.details}
                </Text>
              )}
            </Card>
          ))
        )}
      </View>
    </>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Admin Dashboard',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={[1]}
          keyExtractor={() => 'dashboard'}
          contentContainerStyle={styles.content}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={() => renderContent()}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  errorSubtext: { fontSize: 14, marginTop: 8 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },

  section: { marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  centered: { marginVertical: 32 },
  emptyReports: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 8 },

  reportCard: { marginBottom: 12, paddingVertical: 12 },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reportInfo: { flex: 1 },
  reportReason: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  reportBot: { fontSize: 12, marginBottom: 4 },
  reportTime: { fontSize: 11 },
  reportDetails: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  reportActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8 },
});
