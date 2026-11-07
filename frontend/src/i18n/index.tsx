'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  AppLocale,
  DEFAULT_LOCALE,
  localizePath,
  resolveLocale,
} from './routing';
import { AppMessages, getDictionary } from './dictionaries';

export type { AppMessages };
export { getDictionary };

interface LocaleContextValue {
  locale: AppLocale;
  messages: AppMessages;
  prefixEnabled: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function AppLocaleProvider({
  locale,
  messages,
  prefixEnabled = true,
  children,
}: {
  locale: AppLocale;
  messages?: AppMessages;
  prefixEnabled?: boolean;
  children: React.ReactNode;
}) {
  const resolvedLocale = resolveLocale(locale);
  const resolvedMessages = messages ?? getDictionary(resolvedLocale);

  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale: resolvedLocale,
      messages: resolvedMessages,
      prefixEnabled,
    }),
    [resolvedLocale, resolvedMessages, prefixEnabled],
  );

  return (
    <NextIntlClientProvider
      locale={resolvedLocale}
      messages={resolvedMessages}
      timeZone="UTC"
    >
      <LocaleContext.Provider value={contextValue}>
        {children}
      </LocaleContext.Provider>
    </NextIntlClientProvider>
  );
}

export function useAppLocale(): AppLocale {
  const ctx = useContext(LocaleContext);
  return ctx ? ctx.locale : DEFAULT_LOCALE;
}

export function useDictionary(): AppMessages {
  const ctx = useContext(LocaleContext);
  return ctx ? ctx.messages : getDictionary(DEFAULT_LOCALE);
}

export function useLocalizedHref() {
  const ctx = useContext(LocaleContext);
  const locale = ctx ? ctx.locale : DEFAULT_LOCALE;
  const prefixEnabled = ctx ? ctx.prefixEnabled : false;

  return useMemo(
    () => (href: string) => localizePath(href, locale, prefixEnabled),
    [locale, prefixEnabled],
  );
}
