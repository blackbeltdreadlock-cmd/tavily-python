import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/Colors';

interface RateLimit {
  tier: 'free' | 'premium';
  api_calls_today: number;
  reset_at: string;
}

export default function ApiUsageScreen() {
  const colors = useThemeColors();
  const [userId, setUserId] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(() => {
    loadUser();
  });

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
  };

  useEffect(() => {
    if (userId) {
      loadRateLimit();
    }
  }, [userId]);

  const loadRateLimit = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setRateLimit(data as RateLimit);
      }
    } catch (error: any) {
      console.error('Error loading rate limit:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!rateLimit) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Uso da API',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="sad-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                Sem dados de uso disponíveis
              </Text>
            </View>
          )}
        </View>
      </>
    );
  }

  const maxCalls = rateLimit.tier === 'premium' ? 10000 : 100;
  const usagePercent = (rateLimit.api_calls_today / maxCalls) * 100;
  const resetDate = new Date(rateLimit.reset_at);
  const resetIn = resetDate.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(resetIn / (1000 * 60 * 60)));

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Uso da API',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Card style={styles.tierCard}>
            <View style={styles.tierHeader}>
              <Ionicons
                name={rateLimit.tier === 'premium' ? 'star' : 'flash'}
                size={32}
                color={Colors.brand.primary}
              />
              <View style={styles.tierInfo}>
                <Text style={[styles.tierLabel, { color: colors.text }]}>
                  {rateLimit.tier === 'premium' ? 'Plano Premium' : 'Plano Gratuito'}
                </Text>
                <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>
                  {maxCalls.toLocaleString('pt-BR')} chamadas/dia
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.usageCard}>
            <Text style={[styles.usageTitle, { color: colors.text }]}>Uso Hoje</Text>

            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: usagePercent > 90 ? '#ff4444' : Colors.brand.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.usageText, { color: colors.text }]}>
                {rateLimit.api_calls_today.toLocaleString('pt-BR')} / {maxCalls.toLocaleString('pt-BR')}
              </Text>
            </View>

            <View style={styles.usageStats}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Math.round(usagePercent)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Utilizado</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {hoursLeft}h
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Até reset</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Math.max(0, maxCalls - rateLimit.api_calls_today).toLocaleString('pt-BR')}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Restante</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Reset Automático</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Sua quota é resetada diariamente em {resetDate.toLocaleTimeString('pt-BR')}.
            </Text>
          </Card>

          {rateLimit.tier === 'free' && (
            <Card style={{ ...styles.upgradeCard, borderColor: Colors.brand.primary, borderWidth: 2 } as any}>
              <View style={styles.upgradeHeader}>
                <Ionicons name="star" size={24} color={Colors.brand.primary} />
                <Text style={[styles.upgradeTitle, { color: colors.text }]}>Upgrade para Premium</Text>
              </View>
              <Text style={[styles.upgradeText, { color: colors.textSecondary }]}>
                Obtenha 10.000 chamadas de API por dia com o plano premium. Ideal para aplicações em produção.
              </Text>
            </Card>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginTop: 12 },

  tierCard: { marginBottom: 20 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tierInfo: { flex: 1 },
  tierLabel: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tierDesc: { fontSize: 14 },

  usageCard: { marginBottom: 20 },
  usageTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  progressContainer: { marginBottom: 16 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  usageText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  usageStats: { flexDirection: 'row', gap: 12, marginTop: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12 },

  infoCard: { marginBottom: 20 },
  infoTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 12, lineHeight: 18 },

  upgradeCard: { marginBottom: 20, paddingVertical: 16 },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  upgradeText: { fontSize: 12, lineHeight: 18 },
});
