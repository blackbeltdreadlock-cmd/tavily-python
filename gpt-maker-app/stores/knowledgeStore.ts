import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { chunkText, estimateTokens } from '@/lib/knowledge';
import type { BotKnowledge } from '@/types';

interface KnowledgeState {
  documents: BotKnowledge[];
  loading: boolean;
  uploading: boolean;

  fetchKnowledge: (botId: string) => Promise<void>;
  addTextKnowledge: (botId: string, title: string, content: string) => Promise<void>;
  addFileKnowledge: (
    botId: string,
    file: { name: string; uri: string; mimeType?: string },
  ) => Promise<void>;
  deleteKnowledge: (id: string) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  documents: [],
  loading: false,
  uploading: false,

  fetchKnowledge: async (botId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('bot_knowledge')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ documents: data ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  addTextKnowledge: async (botId, title, content) => {
    set({ uploading: true });
    try {
      await insertDocumentWithChunks({ botId, title, content, contentType: 'text' });
      await get().fetchKnowledge(botId);
    } finally {
      set({ uploading: false });
    }
  },

  addFileKnowledge: async (botId, file) => {
    set({ uploading: true });
    try {
      const response = await fetch(file.uri);
      const content = await response.text();

      // Keep the original around so the owner can re-download it later. A failed
      // upload shouldn't block indexing, so the path is best-effort.
      let filePath: string | null = `${botId}/${Date.now()}-${file.name}`;
      const blob = await (await fetch(file.uri)).blob();
      const { error: uploadError } = await supabase.storage
        .from('knowledge-files')
        .upload(filePath, blob, { contentType: file.mimeType ?? 'text/plain' });

      if (uploadError) filePath = null;

      await insertDocumentWithChunks({
        botId,
        title: file.name,
        content,
        contentType: 'file',
        filePath,
      });
      await get().fetchKnowledge(botId);
    } finally {
      set({ uploading: false });
    }
  },

  deleteKnowledge: async (id) => {
    const { error } = await supabase.from('bot_knowledge').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }));
  },
}));

/**
 * Inserts the document row, then its chunks. If chunk insertion fails the parent
 * row is removed rather than left behind as an empty, unsearchable document.
 */
async function insertDocumentWithChunks(params: {
  botId: string;
  title: string;
  content: string;
  contentType: 'text' | 'file' | 'url';
  filePath?: string | null;
}) {
  const { botId, title, content, contentType, filePath = null } = params;

  const trimmed = content.trim();
  if (!trimmed) throw new Error('O conteudo esta vazio.');

  const { data: doc, error: docError } = await supabase
    .from('bot_knowledge')
    .insert({
      bot_id: botId,
      title,
      content: trimmed,
      content_type: contentType,
      file_path: filePath,
      tokens: estimateTokens(trimmed),
      status: 'processing',
    })
    .select()
    .single();

  if (docError) throw docError;

  try {
    const chunks = chunkText(trimmed);
    if (chunks.length === 0) throw new Error('Nao foi possivel dividir o conteudo.');

    const { error: chunkError } = await supabase.from('bot_knowledge_chunks').insert(
      chunks.map((chunk, index) => ({
        knowledge_id: doc.id,
        bot_id: botId,
        chunk_index: index,
        content: chunk,
        tokens: estimateTokens(chunk),
      })),
    );

    if (chunkError) throw chunkError;

    await supabase.from('bot_knowledge').update({ status: 'ready' }).eq('id', doc.id);
  } catch (err) {
    await supabase.from('bot_knowledge').delete().eq('id', doc.id);
    throw err;
  }
}
