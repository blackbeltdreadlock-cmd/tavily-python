import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useChatStore } from '@/stores/chatStore';
import { Card } from '@/components/ui/Card';
import type { Conversation } from '@/types';

export default function ConversationsScreen() {
  const { id: botId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { conversations, fetchConversations, setActiveConversation, deleteConversation } =
    useChatStore();

  useEffect(() => {
    if (botId) fetchConversations(botId);
  }, [botId]);

  const handleOpen = (conv: Conversation) => {
    setActiveConversation(conv);
    router.push(`/bot/${botId}/chat` as any);
  };

  const handleDelete = (conv: Conversation) => {
    Alert.alert('Excluir conversa', 'Todas as mensagens desta conversa serao apagadas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(conv.id);
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Conversas',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={() => botId && fetchConversations(botId)}
          refreshing={false}
          renderItem={({ item }) => (
            <Card onPress={() => handleOpen(item)} style={styles.card}>
              <View style={styles.row}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                <View style={styles.info}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title ?? 'Conversa sem titulo'}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {item.message_count} {item.message_count === 1 ? 'mensagem' : 'mensagens'} ·{' '}
                    {new Date(item.updated_at).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma conversa ainda
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
  list: { padding: 20 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, marginTop: 16 },
});
