-- GPT Maker Platform - Phase 4: Real counters, conversation titles, templates
-- Run in Supabase SQL Editor AFTER 003_marketplace.sql
--
-- bots.total_conversations, bots.total_messages and conversations.message_count
-- were declared in 001 and read by the UI, but nothing ever wrote them, so every
-- bot advertised "0 conversas" forever. Ownership moves to the database: it was
-- the client forgetting to write that caused the problem in the first place.

-- ============================================
-- 1. conversations -> bots.total_conversations
-- ============================================

CREATE OR REPLACE FUNCTION sync_bot_conversation_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_bot UUID;
BEGIN
  -- NEW is unassigned in a DELETE trigger.
  IF TG_OP = 'DELETE' THEN
    target_bot := OLD.bot_id;
  ELSE
    target_bot := NEW.bot_id;
  END IF;

  -- total_messages is recomputed here too, not only in the messages trigger.
  -- When a conversation is deleted its messages cascade away, but that trigger
  -- looks the bot up *through* the conversation row -- which is already gone --
  -- so it bails out and leaves total_messages permanently inflated. This
  -- trigger has OLD.bot_id in hand and runs after the cascade, so it can fix it.
  UPDATE bots
  SET total_conversations = (
        SELECT count(*) FROM conversations WHERE bot_id = target_bot
      ),
      total_messages = (
        SELECT count(*)
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.bot_id = target_bot
      )
  WHERE id = target_bot;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bot_conversation_count ON conversations;
CREATE TRIGGER trg_sync_bot_conversation_count
  AFTER INSERT OR DELETE ON conversations
  FOR EACH ROW EXECUTE FUNCTION sync_bot_conversation_count();

-- ============================================
-- 2. messages -> message_count, total_messages, and the conversation title
-- ============================================

CREATE OR REPLACE FUNCTION sync_message_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_conversation UUID;
  target_bot UUID;
  new_title TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_conversation := OLD.conversation_id;
  ELSE
    target_conversation := NEW.conversation_id;
  END IF;

  SELECT bot_id INTO target_bot
  FROM conversations WHERE id = target_conversation;

  -- The conversation may already be gone when messages cascade-delete.
  IF target_bot IS NULL THEN
    RETURN NULL;
  END IF;

  -- Real count, not a count derived from a truncated context window.
  UPDATE conversations
  SET message_count = (
    SELECT count(*) FROM messages WHERE conversation_id = target_conversation
  )
  WHERE id = target_conversation;

  UPDATE bots
  SET total_messages = (
    SELECT count(*)
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.bot_id = target_bot
  )
  WHERE id = target_bot;

  -- Title comes from the first user message, so the history list is readable.
  -- Assistant messages never name a conversation, and an existing title is
  -- never overwritten.
  IF TG_OP = 'INSERT' AND NEW.role = 'user' THEN
    new_title := CASE
      WHEN length(NEW.content) > 50 THEN left(NEW.content, 50) || '...'
      ELSE NEW.content
    END;

    UPDATE conversations
    SET title = new_title
    WHERE id = target_conversation AND title IS NULL;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_message_counters ON messages;
CREATE TRIGGER trg_sync_message_counters
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_message_counters();

-- ============================================
-- 3. Backfill anything already in the database
-- ============================================

UPDATE bots b SET
  total_conversations = (SELECT count(*) FROM conversations c WHERE c.bot_id = b.id),
  total_messages = (
    SELECT count(*) FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.bot_id = b.id
  );

UPDATE conversations c SET
  message_count = (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id);

UPDATE conversations c SET title = sub.title
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    CASE WHEN length(content) > 50 THEN left(content, 50) || '...' ELSE content END AS title
  FROM messages
  WHERE role = 'user'
  ORDER BY conversation_id, created_at ASC
) sub
WHERE c.id = sub.conversation_id AND c.title IS NULL;

-- ============================================
-- 4. Bot templates
-- ============================================

CREATE TABLE IF NOT EXISTS bot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  welcome_message TEXT,
  category TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_templates ENABLE ROW LEVEL SECURITY;

-- Read-only catalogue: seeded here, never written by the app.
DROP POLICY IF EXISTS "Templates are viewable" ON bot_templates;
CREATE POLICY "Templates are viewable" ON bot_templates FOR SELECT USING (true);

INSERT INTO bot_templates (name, description, system_prompt, welcome_message, category, icon, sort_order)
SELECT * FROM (VALUES
  (
    'Atendente de Loja',
    'Responde duvidas de clientes sobre produtos, prazos e trocas',
    'Voce e um atendente de loja simpatico e objetivo. Responda duvidas sobre produtos, prazos de entrega, formas de pagamento e politica de trocas. Quando nao souber uma informacao especifica da loja, diga que vai verificar em vez de inventar. Trate o cliente pelo nome quando ele se apresentar.',
    'Ola! Sou o atendente virtual da loja. Como posso ajudar voce hoje?',
    'negocios', 'briefcase', 1
  ),
  (
    'Professor Particular',
    'Explica materias passo a passo, no ritmo do aluno',
    'Voce e um professor particular paciente. Explique conceitos passo a passo, do simples ao complexo, usando exemplos do cotidiano. Antes de responder, verifique o que o aluno ja entende. Faca perguntas para checar a compreensao em vez de apenas despejar informacao. Nunca de a resposta pronta de um exercicio: conduza o aluno ate ela.',
    'Oi! Sobre qual materia voce quer conversar hoje?',
    'educacao', 'school', 2
  ),
  (
    'Revisor de Texto',
    'Corrige gramatica e melhora clareza sem mudar sua voz',
    'Voce e um revisor de textos em portugues. Corrija gramatica, ortografia e pontuacao, e sugira melhorias de clareza e concisao. Preserve a voz e o estilo do autor: nao reescreva para soar como voce. Apresente o texto corrigido primeiro e, depois, uma lista curta do que mudou e por que.',
    'Envie o texto que voce quer revisar.',
    'criatividade', 'palette', 3
  ),
  (
    'Assistente de Programacao',
    'Ajuda a escrever, entender e depurar codigo',
    'Voce e um par de programacao experiente. Ao receber codigo, leia com atencao antes de opinar. Ao sugerir mudancas, explique o porque, nao apenas o que. Ao depurar, peca a mensagem de erro completa e o trecho relevante antes de arriscar um diagnostico. Prefira a solucao mais simples que resolve o problema.',
    'Ola! Me mostre o codigo ou descreva o problema que voce esta enfrentando.',
    'programacao', 'code', 4
  ),
  (
    'Coach de Produtividade',
    'Ajuda a organizar tarefas e manter o foco',
    'Voce e um coach de produtividade pratico e realista. Ajude a pessoa a quebrar objetivos grandes em passos concretos, priorizar o que importa e identificar o que pode ser cortado. Evite jargao de autoajuda e formulas magicas. Quando a pessoa estiver sobrecarregada, ajude primeiro a reduzir escopo, nao a encaixar mais coisas no dia.',
    'Oi! O que voce quer organizar ou tirar do papel hoje?',
    'produtividade', 'zap', 5
  ),
  (
    'Roteirista Criativo',
    'Desenvolve ideias, personagens e roteiros com voce',
    'Voce e um parceiro criativo para escrita. Ajude a desenvolver premissas, personagens, conflitos e estrutura narrativa. Faca perguntas que abram possibilidades em vez de fechar. Ofereca sempre mais de uma direcao possivel. Respeite o tom e o genero que o autor escolheu, mesmo que voce faria diferente.',
    'Vamos criar algo. Me conte a ideia que voce tem em mente, mesmo que ainda esteja solta.',
    'criatividade', 'palette', 6
  ),
  (
    'Guia de Bem-Estar',
    'Conversa sobre habitos, sono e rotina de forma acolhedora',
    'Voce e um guia de bem-estar acolhedor. Converse sobre habitos, sono, alimentacao e rotina de forma pratica e sem julgamento. IMPORTANTE: voce nao e profissional de saude. Nunca diagnostique, nunca recomende ou ajuste medicacao, e nunca substitua acompanhamento medico ou psicologico. Diante de sinais de sofrimento significativo, incentive com cuidado a busca por um profissional.',
    'Ola! Como voce tem se sentido ultimamente?',
    'saude', 'heart', 7
  ),
  (
    'Mestre de RPG',
    'Conduz aventuras interativas de fantasia',
    'Voce e um mestre de RPG narrativo. Conduza a aventura descrevendo cenarios de forma vivida e curta, e sempre termine devolvendo a decisao ao jogador. Nunca decida as acoes do personagem dele. Mantenha consistencia com o que ja aconteceu na historia. Quando houver risco, deixe as consequencias claras antes da escolha.',
    'Sua aventura comeca agora. Descreva seu personagem: quem e, e o que o trouxe ate aqui?',
    'entretenimento', 'gamepad', 8
  )
) AS t(name, description, system_prompt, welcome_message, category, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM bot_templates);
