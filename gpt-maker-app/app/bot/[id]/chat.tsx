import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Text, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useChatStore } from '@/stores/chatStore';
import { useBotStore } from '@/stores/botStore';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { Bot, Message } from '@/types';

export default function ChatScreen() {
  const { id: botId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const flatListRef = useRef<FlatList>(null);
  const [bot, setBot] = useState<Bot | null>(null);

  const {
    activeConversation,
    messages,
    isStreaming,
    streamingContent,
    createConversation,
    resumeOrCreateConversation,
    sendMessage,
    fetchMessages,
    loadOlderMessages,
    hasMoreMessages,
    loadingOlder,
    setActiveConversation,
  } = useChatStore();

  const { fetchBot } = useBotStore();

  useEffect(() => {
    if (botId) {
      fetchBot(botId).then(setBot);
      initConversation();
    }
    return () => setActiveConversation(null);
  }, [botId]);

  const initConversation = async () => {
    if (!botId) return;
    const conv = await resumeOrCreateConversation(botId);
    await fetchMessages(conv.id);
  };

  const handleNewConversation = async () => {
    if (!botId) return;
    const conv = await createConversation(botId);
    await fetchMessages(conv.id);
  };

  const handleSend = async (content: string) => {
    try {
      await sendMessage(content);
    } catch {
      // error handled in store
    }
  };

  const allMessages: (Message | { id: string; role: 'assistant'; content: string })[] = [
    ...messages,
    ...(isStreaming && streamingContent
      ? [{ id: '__streaming', role: 'assistant' as const, content: streamingContent }]
      : []),
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: bot?.name ?? 'Chat',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={handleNewConversation} hitSlop={8}>
                <Ionicons name="create-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/bot/${botId}/conversations` as any)}
                hitSlop={8}
              >
                <Ionicons name="time-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {bot?.welcome_message && messages.length === 0 && !isStreaming && (
          <View style={styles.welcome}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              {bot.welcome_message}
            </Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              content={item.content}
              role={item.role as 'user' | 'assistant'}
              timestamp={'created_at' in item ? item.created_at : undefined}
            />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isStreaming && !streamingContent ? <TypingIndicator /> : null}
          // Older messages page in when the user reaches the top.
          onStartReached={hasMoreMessages ? () => loadOlderMessages() : undefined}
          onStartReachedThreshold={0.2}
          ListHeaderComponent={
            loadingOlder ? (
              <ActivityIndicator style={styles.olderSpinner} color={colors.textSecondary} />
            ) : null
          }
        />

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 18, marginRight: 4 },
  messagesList: { paddingVertical: 16 },
  olderSpinner: { paddingVertical: 12 },
  welcome: { padding: 20, alignItems: 'center' },
  welcomeText: { fontSize: 15, textAlign: 'center', fontStyle: 'italic' },
});
