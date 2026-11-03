'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppLocale, useDictionary } from '@/i18n';
import {
  AppLocale,
  buildLocaleSwitchUrl,
  persistClientLocalePreference,
  SUPPORTED_LOCALES,
} from '@/i18n/routing';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  currentPathOverride?: string;
  currentSearchOverride?: string;
  onSwitched?: (nextLocale: AppLocale) => void;
}

export function LanguageSwitcher({
  className = '',
  compact = false,
  currentPathOverride,
  currentSearchOverride,
  onSwitched,
}: LanguageSwitcherProps) {
  const activeLocale = useAppLocale();
  const dict = useDictionary();
  const router = useRouter();

  const handleSelectLocale = (targetLocale: AppLocale) => {
    if (targetLocale === activeLocale) {
      return;
    }

    const pathname =
      currentPathOverride ??
      (typeof window !== 'undefined' ? window.location.pathname : '/');

    const search =
      currentSearchOverride ??
      (typeof window !== 'undefined' ? window.location.search : '');

    persistClientLocalePreference(targetLocale);

    const nextUrl = buildLocaleSwitchUrl(pathname, search, targetLocale);
    router.push(nextUrl);
    onSwitched?.(targetLocale);
  };

  return (
    <div
      role="group"
      aria-label={dict.LanguageSwitcher.ariaLabel}
      data-testid="language-switcher"
      className={`inline-flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 ${className}`}
    >
      {SUPPORTED_LOCALES.map((loc) => {
        const isActive = loc === activeLocale;
        const shortLabel =
          loc === 'vi'
            ? dict.LanguageSwitcher.viShort
            : dict.LanguageSwitcher.enShort;
        const fullLabel =
          loc === 'vi'
            ? dict.LanguageSwitcher.viLabel
            : dict.LanguageSwitcher.enLabel;

        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleSelectLocale(loc)}
            aria-pressed={isActive}
            aria-label={`${fullLabel} (${shortLabel})`}
            title={fullLabel}
            data-testid={`lang-switch-${loc}`}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 ${
              isActive
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#142B4A] hover:bg-white/80'
            }`}
          >
            {compact ? shortLabel : `${shortLabel}`}
          </button>
        );
      })}
    </div>
  );
}
