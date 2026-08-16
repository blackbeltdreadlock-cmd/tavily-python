import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';

export function useChat(conversationId?: string) {
  const store = useChatStore();

  useEffect(() => {
    if (conversationId) {
      store.fetchMessages(conversationId);
      const unsubscribe = store.subscribeToMessages(conversationId);
      return unsubscribe;
    }
  }, [conversationId]);

  return store;
}
