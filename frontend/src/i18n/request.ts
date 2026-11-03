import { getRequestConfig } from 'next-intl/server';
import { isValidLocale, routing } from './routing';
import viMessages from '../../messages/vi.json';
import enMessages from '../../messages/en.json';

export const MESSAGES_BY_LOCALE = {
  vi: viMessages,
  en: enMessages,
} as const;

export type AppMessages = typeof viMessages;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isValidLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: MESSAGES_BY_LOCALE[locale],
  };
});
