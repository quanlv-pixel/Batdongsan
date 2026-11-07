import {
  AppLocale,
  DEFAULT_LOCALE,
  resolveLocale,
} from './routing';
import viMessages from '../../messages/vi.json';
import enMessages from '../../messages/en.json';

export type AppMessages = typeof viMessages;

const MESSAGES_MAP: Record<AppLocale, AppMessages> = {
  vi: viMessages,
  en: enMessages,
};

export function getDictionary(locale: AppLocale = DEFAULT_LOCALE): AppMessages {
  return MESSAGES_MAP[resolveLocale(locale)];
}
