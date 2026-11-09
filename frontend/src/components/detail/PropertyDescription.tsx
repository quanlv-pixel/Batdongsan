'use client';

import React from 'react';
import { useDictionary } from '@/i18n';

interface PropertyDescriptionProps {
  description: string;
}

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const dict = useDictionary();

  const paragraphs = (description || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
      <h2 className="font-display text-xl font-bold text-[#142B4A] mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#0F766E]">
          description
        </span>
        <span>{dict.PropertyDetail.description.title}</span>
      </h2>

      <div className="text-slate-600 text-sm leading-relaxed space-y-3.5">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => <p key={idx}>{para}</p>)
        ) : (
          <p className="text-slate-400 italic">
            {dict.PropertyDetail.description.noDescription}
          </p>
        )}
      </div>
    </div>
  );
}
