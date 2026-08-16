import { useEffect } from 'react';
import { useBotStore } from '@/stores/botStore';

export function useMyBots() {
  const { bots, loading, fetchMyBots } = useBotStore();

  useEffect(() => {
    fetchMyBots();
  }, []);

  return { bots, loading, refresh: fetchMyBots };
}

export function useBot(id: string) {
  const { fetchBot } = useBotStore();
  const [bot, setBotState] = [null, () => {}] as any;

  useEffect(() => {
    fetchBot(id).then(setBotState);
  }, [id]);

  return { bot };
}
