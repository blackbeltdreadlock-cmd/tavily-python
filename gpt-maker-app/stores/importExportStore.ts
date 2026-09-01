import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Bot, BotKnowledge } from '@/types';

export interface BotExportData {
  bot: Omit<Bot, 'owner'>;
  knowledge: BotKnowledge[];
  version: string;
  exportedAt: string;
}

interface ImportExportState {
  exporting: boolean;
  importing: boolean;

  exportBotAsJson: (botId: string) => Promise<BotExportData>;
  importBotFromJson: (jsonData: BotExportData, userId: string) => Promise<Bot>;
}

export const useImportExportStore = create<ImportExportState>((set) => ({
  exporting: false,
  importing: false,

  exportBotAsJson: async (botId) => {
    set({ exporting: true });
    try {
      // Fetch bot data
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (botError) throw botError;

      // Fetch knowledge
      const { data: knowledge, error: knowledgeError } = await supabase
        .from('bot_knowledge')
        .select('*')
        .eq('bot_id', botId);

      if (knowledgeError) throw knowledgeError;

      const exportData: BotExportData = {
        bot,
        knowledge: knowledge ?? [],
        version: '1.0',
        exportedAt: new Date().toISOString(),
      };

      return exportData;
    } finally {
      set({ exporting: false });
    }
  },

  importBotFromJson: async (jsonData, userId) => {
    set({ importing: true });
    try {
      // Validate required fields
      if (!jsonData.bot?.name || !jsonData.bot?.system_prompt || !jsonData.bot?.model) {
        throw new Error('Dados inválidos: nome, system_prompt e model são obrigatórios');
      }

      // Create new bot
      const { data: newBot, error: botCreateError } = await supabase
        .from('bots')
        .insert({
          owner_id: userId,
          name: jsonData.bot.name,
          description: jsonData.bot.description || null,
          avatar_url: jsonData.bot.avatar_url || null,
          system_prompt: jsonData.bot.system_prompt,
          welcome_message: jsonData.bot.welcome_message || null,
          model: jsonData.bot.model,
          temperature: jsonData.bot.temperature || 0.7,
          max_tokens: jsonData.bot.max_tokens || 2048,
          is_public: false,
          is_published: false,
          category: jsonData.bot.category || null,
          tags: jsonData.bot.tags || [],
        })
        .select()
        .single();

      if (botCreateError) throw botCreateError;

      // Import knowledge if provided
      if (jsonData.knowledge && jsonData.knowledge.length > 0) {
        const knowledgeToCreate = jsonData.knowledge.map((k) => ({
          bot_id: newBot.id,
          title: k.title,
          content: k.content,
          content_type: k.content_type,
          source_url: k.source_url || null,
          file_path: k.file_path || null,
          tokens: k.tokens || 0,
          status: 'ready' as const,
          chunk_count: k.chunk_count || 1,
          error_message: null,
        }));

        const { error: knowledgeError } = await supabase
          .from('bot_knowledge')
          .insert(knowledgeToCreate);

        if (knowledgeError) {
          console.error('Warning: Knowledge import partial', knowledgeError);
        }
      }

      return newBot;
    } finally {
      set({ importing: false });
    }
  },
}));
