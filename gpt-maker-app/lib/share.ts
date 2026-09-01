import * as Linking from 'expo-linking';

/** Public web landing page for a bot. Update when the marketing site exists. */
const WEB_BASE = 'https://gptmaker.app';

/**
 * Deep link into the app. `app.json` registers the `gptmaker` scheme, so
 * `gptmaker://bot/<id>` opens straight to the bot on a device that has the app.
 */
export function botDeepLink(botId: string): string {
  return Linking.createURL(`/bot/${botId}`, { scheme: 'gptmaker' });
}

/** Shareable URL. Uses the web address so the link is useful without the app. */
export function botShareUrl(botId: string): string {
  return `${WEB_BASE}/bot/${botId}`;
}
