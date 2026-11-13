'use client';

import React, { useState, useEffect } from 'react';
import { useDictionary } from '@/i18n';
import { apiClient } from '@/lib/api-client';
import {
  MlsSharePermission,
  MyListingItem,
  ReceivedMlsShareItem,
} from '@/types';

interface GrantMlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvedListings?: MyListingItem[];
  preselectedListingId?: string;
  onSuccess?: (newShare?: ReceivedMlsShareItem) => void;
  locale?: string;
}

export function GrantMlsModal({
  isOpen,
  onClose,
  approvedListings = [],
  preselectedListingId,
  onSuccess,
}: GrantMlsModalProps) {
  const dict = useDictionary();
  const [listingId, setListingId] = useState(
    preselectedListingId || approvedListings[0]?.id || '',
  );
  const [recipientId, setRecipientId] = useState('');
  const [permission, setPermission] = useState<MlsSharePermission>('VIEW');
  const [expiresAt, setExpiresAt] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!listingId) {
      setErrorMessage(dict.Workspace.mls.selectListing);
      return;
    }

    if (!recipientId.trim()) {
      setErrorMessage(dict.Workspace.mls.recipientPlaceholder);
      return;
    }

    setIsLoading(true);
    try {
      const share = await apiClient.grantMlsShare({
        listingId,
        recipientId: recipientId.trim(),
        permission,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onSuccess?.(share);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi chia sẻ MLS';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-mls-modal-title"
      data-testid="grant-mls-modal"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2
              id="grant-mls-modal-title"
              className="text-lg font-bold text-[#142B4A]"
            >
              {dict.Workspace.mls.shareModalTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {dict.Workspace.mls.shareModalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Đóng"
            data-testid="grant-mls-close-btn"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
              data-testid="grant-mls-error"
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Select Listing */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.mls.selectListing} <span className="text-rose-500">*</span>
            </label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] bg-white"
              data-testid="grant-mls-listing-select"
            >
              {approvedListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.propertyType})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Agent ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.mls.recipientAgentId} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder={dict.Workspace.mls.recipientPlaceholder}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E]"
              data-testid="grant-mls-recipient-input"
            />
            {/* Quick Agent Selection Pills for testing & seed */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400">Gợi ý đối tác mẫu:</span>
              <button
                type="button"
                onClick={() => setRecipientId('seed_user_agent_a')}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                Môi giới A (seed_user_agent_a)
              </button>
              <button
                type="button"
                onClick={() => setRecipientId('seed_user_agent_b')}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                Môi giới B (seed_user_agent_b)
              </button>
            </div>
          </div>

          {/* Permission Radio Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {dict.Workspace.mls.permission}
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  permission === 'VIEW'
                    ? 'border-[#0F766E] bg-teal-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="mls-permission"
                  value="VIEW"
                  checked={permission === 'VIEW'}
                  onChange={() => setPermission('VIEW')}
                  className="mt-0.5 text-[#0F766E] focus:ring-[#0F766E]"
                  data-testid="grant-mls-permission-view"
                />
                <div>
                  <span className="text-xs font-bold text-[#142B4A] block">
                    {dict.Workspace.mls.permView}
                  </span>
                  <span className="text-xs text-slate-500 leading-normal block mt-0.5">
                    {dict.Workspace.mls.permissionViewDesc}
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  permission === 'MANAGE'
                    ? 'border-[#0F766E] bg-teal-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="mls-permission"
                  value="MANAGE"
                  checked={permission === 'MANAGE'}
                  onChange={() => setPermission('MANAGE')}
                  className="mt-0.5 text-[#0F766E] focus:ring-[#0F766E]"
                  data-testid="grant-mls-permission-manage"
                />
                <div>
                  <span className="text-xs font-bold text-[#142B4A] block">
                    {dict.Workspace.mls.permManage}
                  </span>
                  <span className="text-xs text-slate-500 leading-normal block mt-0.5">
                    {dict.Workspace.mls.permissionManageDesc}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {dict.Workspace.mls.expiresAt} (Tùy chọn)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#0F766E] bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {dict.Workspace.createModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D655E] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              data-testid="grant-mls-submit-btn"
            >
              {isLoading && (
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
              )}
              <span>
                {isLoading
                  ? dict.Workspace.mls.sharing
                  : dict.Workspace.mls.shareSubmit}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GrantMlsModal;

