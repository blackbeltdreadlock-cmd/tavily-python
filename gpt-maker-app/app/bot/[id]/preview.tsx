import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useChatStore } from '@/stores/chatStore';
import { useBotStore } from '@/stores/botStore';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import Colors from '@/constants/Colors';
import type { Bot, Message } from '@/types';

/**
 * Throwaway chat used to try a bot out. It runs against a real conversation
 * (the chat function needs one to write messages into) but deletes it on the
 * way out, so previews never show up in history or inflate the bot's counters.
 */
export default function PreviewScreen() {
  const { id: botId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const flatListRef = useRef<FlatList>(null);
  const [bot, setBot] = useState<Bot | null>(null);
  // Ref rather than state: the cleanup callback needs the id at unmount time.
  const conversationIdRef = useRef<string | null>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    createConversation,
    sendMessage,
    deleteConversation,
    setActiveConversation,
  } = useChatStore();

  const { fetchBot } = useBotStore();

  useEffect(() => {
    if (!botId) return;

    fetchBot(botId).then(setBot);
    createConversation(botId).then((conv) => {
      conversationIdRef.current = conv.id;
    });

    return () => {
      const id = conversationIdRef.current;
      setActiveConversation(null);
      // Messages cascade with the conversation row.
      if (id) deleteConversation(id).catch(() => {});
    };
  }, [botId]);

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
          title: 'Preview',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Teste temporario · nada aqui e salvo no historico
          </Text>
        </View>

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
        />

        <ChatInput onSend={(text) => sendMessage(text).catch(() => {})} disabled={isStreaming} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    backgroundColor: Colors.brand.accent,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bannerText: { color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  messagesList: { paddingVertical: 16 },
  welcome: { padding: 20, alignItems: 'center' },
  welcomeText: { fontSize: 15, textAlign: 'center', fontStyle: 'italic' },
});
