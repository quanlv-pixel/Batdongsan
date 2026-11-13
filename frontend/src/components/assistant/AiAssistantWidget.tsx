'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useDictionary, useLocale, useLocalizedHref } from '@/i18n';
import {
  formatAdministrativeLocation,
  formatArea,
  formatVndPrice,
} from '@/lib/formatters';
import {
  AssistantChatResponse,
  AssistantHistoryItem,
  AssistantListingRecommendation,
} from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: AssistantListingRecommendation[];
  isError?: boolean;
  failedQuery?: string;
}

const MAX_MESSAGE_LENGTH = 500;

export function AiAssistantWidget() {
  const dict = useDictionary();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const t = dict.AiAssistant;

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(0);

  const generateMsgId = (prefix: string) => {
    nextIdRef.current += 1;
    return `${prefix}-${nextIdRef.current}`;
  };

  const starterPrompts = [
    t.suggestion1,
    t.suggestion2,
    t.suggestion3,
    t.suggestion4,
  ];

  // Handle Escape key to close the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll to bottom when messages or loading state change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isLoading]);

  const sendQuery = async (rawQuery: string, isRetry = false) => {
    const trimmed = rawQuery.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed || isLoading) return;

    const userMsgId = generateMsgId('u');
    if (!isRetry) {
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'user', content: trimmed },
      ]);
      setInputValue('');
    } else {
      // Remove trailing error message before retrying
      setMessages((prev) => prev.filter((m) => !m.isError));
    }

    setIsLoading(true);

    const historyPayload: AssistantHistoryItem[] = messages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          locale,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as AssistantChatResponse;

      setMessages((prev) => [
        ...prev,
        {
          id: generateMsgId('a'),
          role: 'assistant',
          content: data.reply,
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations
            : [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateMsgId('err'),
          role: 'assistant',
          content: t.errorMessage,
          isError: true,
          failedQuery: trimmed,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuery(inputValue);
  };

  const handleClear = () => {
    setMessages([]);
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <section
          data-testid="ai-assistant-panel"
          role="dialog"
          aria-label={t.title}
          className="fixed bottom-20 right-3 sm:right-5 z-50 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[min(600px,calc(100vh-6.5rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <header className="bg-[#142B4A] text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  smart_toy
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">{t.title}</h2>
                <p className="text-[11px] text-slate-300 truncate">
                  {t.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  data-testid="ai-assistant-clear"
                  onClick={handleClear}
                  aria-label={t.clearLabel}
                  title={t.clearLabel}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete_sweep
                  </span>
                </button>
              )}
              <button
                type="button"
                data-testid="ai-assistant-close"
                onClick={() => {
                  setIsOpen(false);
                  toggleBtnRef.current?.focus();
                }}
                aria-label={t.closeLabel}
                title={t.closeLabel}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
          </header>

          {/* Disclaimer Banner */}
          <div className="bg-amber-50 border-b border-amber-100 px-3.5 py-2 text-[11px] text-amber-900 flex items-start gap-2 shrink-0">
            <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0 mt-0.5">
              verified_user
            </span>
            <span>{t.disclaimer}</span>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70">
            {/* Welcome Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed shadow-xs">
              <p>{t.welcomeMessage}</p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-500">
                {t.suggestionsTitle}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    data-testid="ai-assistant-suggestion"
                    disabled={isLoading}
                    onClick={() => void sendQuery(prompt)}
                    className="text-left text-xs px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-[#142B4A] hover:border-amber-500 hover:bg-amber-50/60 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Turns */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-[#142B4A] text-white rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-xs'
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.isError && msg.failedQuery && (
                    <button
                      type="button"
                      data-testid="ai-assistant-retry"
                      onClick={() => void sendQuery(msg.failedQuery!, true)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 underline hover:text-red-900 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        refresh
                      </span>
                      {t.retryLabel}
                    </button>
                  )}
                </div>

                {/* Recommendation Cards */}
                {msg.role === 'assistant' &&
                  msg.recommendations &&
                  msg.recommendations.length > 0 && (
                    <div className="w-full mt-2 space-y-2">
                      {msg.recommendations.map((item) => {
                        const formattedPrice = formatVndPrice(item.priceVnd, {
                          transactionType: item.transactionType,
                          rentalPeriod: item.rentalPeriod,
                          locale,
                        });
                        const formattedArea = formatArea(item.areaSqm, locale);
                        const formattedLocation =
                          formatAdministrativeLocation(item);
                        const detailUrl = localizedHref(
                          `/bat-dong-san/${item.id}`,
                        );

                        return (
                          <Link
                            key={item.id}
                            href={detailUrl}
                            data-testid="ai-recommendation-card"
                            className="flex gap-2.5 p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-sm transition-all group"
                          >
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 relative flex items-center justify-center">
                              {item.thumbnailUrl ? (
                                <Image
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  width={64}
                                  height={64}
                                  unoptimized
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400 text-[24px]">
                                  apartment
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                              <h3 className="text-xs font-semibold text-[#142B4A] line-clamp-1 group-hover:text-amber-700 transition-colors">
                                {item.title}
                              </h3>
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="font-bold text-amber-700">
                                  {formattedPrice}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600">
                                  {formattedArea}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {formattedLocation}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div
                data-testid="ai-assistant-loading"
                className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 w-fit"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{t.loadingText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                data-testid="ai-assistant-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={t.inputPlaceholder}
                aria-label={t.inputPlaceholder}
                disabled={isLoading}
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="submit"
                data-testid="ai-assistant-submit"
                disabled={isLoading || inputValue.trim().length === 0}
                aria-label={t.sendLabel}
                className="px-3.5 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-semibold hover:bg-[#1e3a5f] disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>{t.sendLabel}</span>
                <span className="material-symbols-outlined text-[16px]">
                  send
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>{t.charLimitNotice}</span>
              <span>
                {inputValue.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </form>
        </section>
      )}

      {/* Floating Launcher Button */}
      <button
        ref={toggleBtnRef}
        type="button"
        data-testid="ai-assistant-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t.launcherAriaLabel}
        aria-expanded={isOpen}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[#142B4A] text-white shadow-lg hover:bg-[#1e3a5f] hover:shadow-xl transition-all border border-amber-400/30 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px] text-amber-300">
          {isOpen ? 'close' : 'smart_toy'}
        </span>
        <span className="text-xs font-semibold hidden sm:inline">
          {t.launcherLabel}
        </span>
      </button>
    </>
  );
}
