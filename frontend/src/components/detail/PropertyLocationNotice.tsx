'use client';

import React from 'react';
import { PublicListingSummary } from '@/types';
import { formatAdministrativeLocation } from '@/lib/formatters';
import { useDictionary } from '@/i18n';

interface PropertyLocationNoticeProps {
  listing: PublicListingSummary;
}

export function PropertyLocationNotice({ listing }: PropertyLocationNoticeProps) {
  const dict = useDictionary();
  const locationFormatted = formatAdministrativeLocation(listing);

  return (
    <div
      data-testid="property-location-notice"
      className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm"
    >
      <h2 className="font-display text-xl font-bold text-[#142B4A] mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#0F766E]">map</span>
        <span>{dict.PropertyDetail.location.title}</span>
      </h2>

      <p className="text-slate-600 text-sm mb-4 leading-relaxed">
        {dict.PropertyDetail.location.privacyExplanation}
      </p>

      {/* Styled Locator Sandbox Box */}
      <div className="relative w-full h-64 sm:h-72 rounded-xl border border-slate-200 overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 flex items-center justify-center">
        {/* Subtle Map Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #0F766E 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Central Pulse Radius */}
        <div className="relative flex items-center justify-center">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#0F766E]/10 border-2 border-[#0F766E]/30 animate-pulse flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#0F766E]/20 border border-[#0F766E]/40" />
          </div>
          <div className="absolute w-12 h-12 rounded-full bg-[#0F766E] text-white flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-2xl">location_searching</span>
          </div>
        </div>

        {/* Informative Location Tag at Bottom */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-[#142B4A] font-medium min-w-0">
            <span className="material-symbols-outlined text-[#0F766E] text-base shrink-0">
              security
            </span>
            <span className="truncate">{locationFormatted}</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px] shrink-0">
            {dict.PropertyDetail.location.radius}
          </span>
        </div>
      </div>
    </div>
  );
}
