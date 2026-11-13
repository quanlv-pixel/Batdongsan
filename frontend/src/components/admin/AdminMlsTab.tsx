'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AdminMlsShareItem } from '@/types';

interface AdminMlsTabProps {
  locale: string;
}

export function AdminMlsTab({ locale }: AdminMlsTabProps) {
  const t = useTranslations('AdminPortal.mls');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [shares, setShares] = useState<AdminMlsShareItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Revoke modal state
  const [revokingShare, setRevokingShare] = useState<AdminMlsShareItem | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState<boolean>(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadShares = async () => {
      try {
        const res = await apiClient.getAdminMlsShares({ limit: 50 });
        if (!ignore) {
          setShares(res.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage(locale === 'vi' ? 'Không thể tải danh sách chia sẻ MLS.' : 'Failed to load MLS shares.');
          }
          setIsLoading(false);
        }
      }
    };

    loadShares();
    return () => {
      ignore = true;
    };
  }, [refreshKey, locale]);

  const openRevokeModal = (share: AdminMlsShareItem) => {
    setRevokingShare(share);
    setRevokeReason('');
    setRevokeError(null);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingShare) return;
    setIsSubmittingRevoke(true);
    setRevokeError(null);
    try {
      await apiClient.revokeMlsShareAsAdmin(revokingShare.id, revokeReason.trim() || undefined);
      setRevokingShare(null);
      setFeedbackMessage(t('revokeSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setRevokeError(err.message);
      } else {
        setRevokeError(locale === 'vi' ? 'Lỗi khi thu hồi quyền chia sẻ MLS.' : 'Error revoking MLS share.');
      }
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-mls-tab">
      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-neutral-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-3" />
          <p className="text-sm">{locale === 'vi' ? 'Đang tải danh sách MLS...' : 'Loading MLS shares...'}</p>
        </div>
      ) : shares.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200 shadow-sm text-neutral-500">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-2">share</span>
          <p className="text-sm font-medium">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="p-3.5">{t('listingTitle')}</th>
                  <th className="p-3.5">{t('grantedBy')}</th>
                  <th className="p-3.5">{t('receivedBy')}</th>
                  <th className="p-3.5">{t('permission')}</th>
                  <th className="p-3.5">{t('status')}</th>
                  <th className="p-3.5">{t('expiresAt')}</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {shares.map((share) => (
                  <tr key={share.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-neutral-900 max-w-xs truncate" title={share.listing.title}>
                        {share.listing.title}
                      </div>
                      <div className="text-neutral-500 text-[11px]">
                        {share.listing.district}, {share.listing.province}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-neutral-900">{share.grantedBy.fullName}</div>
                      <div className="text-neutral-500 text-[11px]">{share.grantedBy.email}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-neutral-900">{share.receivedBy.fullName}</div>
                      <div className="text-neutral-500 text-[11px]">{share.receivedBy.email}</div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {share.permission === 'MANAGE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          MANAGE (Toàn quyền)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          VIEW (Chỉ xem)
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {share.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          {t('active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200 text-neutral-700">
                          {t('revoked')}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-neutral-500">
                      {share.expiresAt
                        ? new Date(share.expiresAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')
                        : t('unlimited')}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      {share.isActive && (
                        <button
                          type="button"
                          data-testid={`revoke-mls-btn-${share.id}`}
                          onClick={() => openRevokeModal(share)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          {t('revokeAction')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokingShare && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">{t('revokeModalTitle')}</h3>
            <p className="text-xs text-neutral-600">
              Thu hồi quyền MLS đối với: <strong className="text-neutral-800">{revokingShare.listing.title}</strong> cho môi giới: <strong className="text-neutral-800">{revokingShare.receivedBy.fullName}</strong>.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">{t('revokeReasonPlaceholder')}</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder={t('revokeReasonPlaceholder')}
                rows={2}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {revokeError && (
              <p className="text-xs text-red-600">{revokeError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="cancel-revoke-btn"
                onClick={() => setRevokingShare(null)}
                disabled={isSubmittingRevoke}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                data-testid="confirm-revoke-btn"
                onClick={handleConfirmRevoke}
                disabled={isSubmittingRevoke}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingRevoke ? '...' : t('confirmRevoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMlsTab;
