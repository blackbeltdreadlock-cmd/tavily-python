import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types';

const MESSAGE_PAGE_SIZE = 50;

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  hasMoreMessages: boolean;
  loadingOlder: boolean;

  fetchConversations: (botId?: string) => Promise<void>;
  createConversation: (botId: string) => Promise<Conversation>;
  resumeOrCreateConversation: (botId: string) => Promise<Conversation>;
  setActiveConversation: (conv: Conversation | null) => void;
  deleteConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  hasMoreMessages: false,
  loadingOlder: false,

  fetchConversations: async (botId) => {
    let query = supabase
      .from('conversations')
      .select('*, bot:bots(id, name, avatar_url)')
      .order('updated_at', { ascending: false });

    if (botId) query = query.eq('bot_id', botId);

    const { data, error } = await query;
    if (error) throw error;
    set({ conversations: data ?? [] });
  },

  createConversation: async (botId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('conversations')
      .insert({ bot_id: botId, user_id: user.id })
      .select('*, bot:bots(id, name, avatar_url)')
      .single();

    if (error) throw error;

    set((state) => ({
      conversations: [data, ...state.conversations],
      activeConversation: data,
    }));
    return data;
  },

  /**
   * Picks up the most recent active conversation with this bot, creating one
   * only when there is none. Opening a bot used to start a brand new
   * conversation every time, orphaning the previous history.
   */
  resumeOrCreateConversation: async (botId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('conversations')
      .select('*, bot:bots(id, name, avatar_url)')
      .eq('bot_id', botId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      set({ activeConversation: existing, messages: [] });
      return existing;
    }

    return get().createConversation(botId);
  },

  setActiveConversation: (conv) => set({ activeConversation: conv, messages: [] }),

  deleteConversation: async (id) => {
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) throw error;

    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversation: state.activeConversation?.id === id ? null : state.activeConversation,
      messages: state.activeConversation?.id === id ? [] : state.messages,
    }));
  },

  /** Loads the most recent page, oldest-first for rendering. */
  fetchMessages: async (conversationId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE);

    if (error) throw error;

    const page = data ?? [];
    set({
      messages: page.slice().reverse(),
      hasMoreMessages: page.length === MESSAGE_PAGE_SIZE,
    });
  },

  /** Pages backwards from the oldest message currently held. */
  loadOlderMessages: async () => {
    const { activeConversation, messages, hasMoreMessages, loadingOlder } = get();
    if (!activeConversation || !hasMoreMessages || loadingOlder || messages.length === 0) return;

    set({ loadingOlder: true });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .lt('created_at', messages[0].created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (error) throw error;

      const page = data ?? [];
      set((state) => ({
        messages: [...page.slice().reverse(), ...state.messages],
        hasMoreMessages: page.length === MESSAGE_PAGE_SIZE,
      }));
    } finally {
      set({ loadingOlder: false });
    }
  },

  sendMessage: async (content) => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    set({ isStreaming: true, streamingContent: '' });

    try {
      // Insert first and render the row the database returned, rather than a
      // client-generated UUID that would never match it. Realtime dedupes by
      // id, so a client-side id makes that guard useless -- which is why
      // subscribeToMessages stays unwired for now.
      const { data: userMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          role: 'user',
          content,
        })
        .select()
        .single();
      if (msgError) throw msgError;

      set({ messages: [...messages, userMessage as Message] });

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            bot_id: activeConversation.bot_id,
            conversation_id: activeConversation.id,
            message: content,
          }),
        },
      );

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  set({ streamingContent: fullContent });
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        }
      }

      // The edge function persists the assistant reply, so read that row back
      // instead of inventing an id locally. Falls back to the streamed text if
      // the read fails, so a persistence hiccup never hides the answer the user
      // already watched arrive.
      const { data: persisted } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const assistantMessage: Message = (persisted as Message | null) ?? {
        id: `local-${Date.now()}`,
        conversation_id: activeConversation.id,
        role: 'assistant',
        content: fullContent,
        tokens_used: 0,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isStreaming: false,
        streamingContent: '',
      }));
    } catch (error) {
      set({ isStreaming: false, streamingContent: '' });
      throw error;
    }
  },

  subscribeToMessages: (conversationId) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          set((state) => {
            const exists = state.messages.some((m) => m.id === newMessage.id);
            if (exists) return state;
            return { messages: [...state.messages, newMessage] };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
