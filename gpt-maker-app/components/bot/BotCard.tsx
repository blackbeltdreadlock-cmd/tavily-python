import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useThemeColors } from '@/hooks/useThemeColor';
import type { Bot } from '@/types';

interface BotCardProps {
  bot: Bot;
  onPress: () => void;
}

export function BotCard({ bot, onPress }: BotCardProps) {
  const colors = useThemeColors();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Avatar uri={bot.avatar_url} name={bot.name} size={52} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {bot.name}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {bot.description || 'Sem descricao'}
          </Text>
          <View style={styles.stats}>
            <Text style={[styles.stat, { color: colors.textSecondary }]}>
              {bot.total_conversations} conversas
            </Text>
            {bot.rating_count > 0 && (
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                {bot.rating_avg.toFixed(1)} ({bot.rating_count})
              </Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  description: { fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 6 },
  stat: { fontSize: 12 },
});
