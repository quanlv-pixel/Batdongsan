'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AdminListingItem, ModerationLogItem } from '@/types';
import { formatVndPrice } from '@/lib/formatters';

interface ModerationTabProps {
  locale: string;
}

export function ModerationTab({ locale }: ModerationTabProps) {
  const t = useTranslations('AdminPortal.moderation');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [listings, setListings] = useState<AdminListingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingListing, setRejectingListing] = useState<AdminListingItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // History modal state
  const [historyListing, setHistoryListing] = useState<AdminListingItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ModerationLogItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    const loadListings = async () => {
      try {
        const res = await apiClient.getAdminListings({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchTerm.trim() || undefined,
          limit: 50,
        });
        if (!ignore) {
          setListings(res.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage(locale === 'vi' ? 'Không thể tải hàng đợi kiểm duyệt.' : 'Failed to load moderation queue.');
          }
          setIsLoading(false);
        }
      }
    };

    loadListings();
    return () => {
      ignore = true;
    };
  }, [statusFilter, searchTerm, refreshKey, locale]);

  const handleApprove = async (listing: AdminListingItem) => {
    try {
      setFeedbackMessage(null);
      await apiClient.moderateListing(listing.id, {
        status: 'APPROVED',
      });
      setFeedbackMessage(t('approveSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      } else {
        alert(locale === 'vi' ? 'Lỗi khi phê duyệt tin đăng.' : 'Error approving listing.');
      }
    }
  };

  const openRejectModal = (listing: AdminListingItem) => {
    setRejectingListing(listing);
    setRejectReason('');
    setRejectError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingListing) return;
    if (!rejectReason.trim()) {
      setRejectError(t('rejectReasonRequired'));
      return;
    }

    setIsSubmittingReject(true);
    setRejectError(null);
    try {
      await apiClient.moderateListing(rejectingListing.id, {
        status: 'REJECTED',
        reason: rejectReason.trim(),
      });
      setRejectingListing(null);
      setFeedbackMessage(t('rejectSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setRejectError(err.message);
      } else {
        setRejectError(locale === 'vi' ? 'Lỗi khi từ chối tin đăng.' : 'Error rejecting listing.');
      }
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const openHistoryModal = async (listing: AdminListingItem) => {
    setHistoryListing(listing);
    setIsLoadingHistory(true);
    try {
      const logs = await apiClient.getModerationHistory(listing.id);
      setHistoryLogs(logs);
    } catch (err) {
      console.error('Failed to load moderation history', err);
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            {status}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {status}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            {status}
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="moderation-tab">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'PENDING', label: t('filterPending') },
              { key: 'APPROVED', label: t('filterApproved') },
              { key: 'REJECTED', label: t('filterRejected') },
              { key: 'DRAFT', label: t('filterDraft') },
              { key: 'ALL', label: t('filterAll') },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                data-testid={`status-filter-${f.key.toLowerCase()}`}
                onClick={() => {
                  setIsLoading(true);
                  setStatusFilter(f.key);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === f.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-base">
              search
            </span>
          </div>
        </div>
      </div>

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

      {/* Listings Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-3" />
          <p className="text-sm">{locale === 'vi' ? 'Đang tải danh sách tin đăng...' : 'Loading listings queue...'}</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200 shadow-sm text-neutral-500">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-2">assignment_turned_in</span>
          <p className="text-sm font-medium">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="p-3.5">Bất động sản</th>
                  <th className="p-3.5">{t('ownerLabel')}</th>
                  <th className="p-3.5">{t('priceLabel')} / {t('areaLabel')}</th>
                  <th className="p-3.5">{t('locationLabel')}</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">{t('submittedAt')}</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {listings.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3 max-w-xs">
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                          {item.images && item.images.length > 0 ? (
                            <Image
                              src={item.images[0].url}
                              alt={item.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="material-symbols-outlined text-neutral-400 text-lg">image</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 truncate" title={item.title}>
                            {item.title}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {item.propertyType} • {item.transactionType}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-neutral-900 font-medium">{item.owner.fullName}</div>
                      <div className="text-neutral-500 text-[11px]">{item.owner.email}</div>
                      {item.owner.phone && (
                        <div className="text-neutral-500 text-[11px]">{item.owner.phone}</div>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-semibold text-primary-700">
                        {formatVndPrice(item.priceVnd)}
                      </div>
                      <div className="text-neutral-500 text-[11px]">{item.areaSqm} m²</div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-neutral-800">{item.district}, {item.province}</div>
                      {item.streetAddress && (
                        <div className="text-neutral-400 text-[10px] truncate max-w-[160px]" title={item.streetAddress}>
                          {item.streetAddress}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-neutral-500">
                      {new Date(item.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                      {item.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            data-testid={`approve-btn-${item.id}`}
                            onClick={() => handleApprove(item)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            {t('approveAction')}
                          </button>
                          <button
                            type="button"
                            data-testid={`reject-btn-${item.id}`}
                            onClick={() => openRejectModal(item)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            {t('rejectAction')}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        data-testid={`history-btn-${item.id}`}
                        onClick={() => openHistoryModal(item)}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
                      >
                        {t('historyAction')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingListing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">{t('rejectModalTitle')}</h3>
            <p className="text-xs text-neutral-600">{t('rejectModalPrompt')}</p>
            <p className="text-xs font-medium text-neutral-800 bg-neutral-50 p-2 rounded border border-neutral-200">
              {rejectingListing.title}
            </p>

            <textarea
              data-testid="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectReasonPlaceholder')}
              rows={3}
              className="w-full text-xs p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />

            {rejectError && (
              <p className="text-xs text-red-600">{rejectError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="cancel-reject-btn"
                onClick={() => setRejectingListing(null)}
                disabled={isSubmittingReject}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                data-testid="confirm-reject-btn"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingReject ? '...' : t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyListing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">{t('historyModalTitle')}</h3>
              <button
                onClick={() => setHistoryListing(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-medium text-neutral-800 truncate" title={historyListing.title}>
              {historyListing.title}
            </p>

            {isLoadingHistory ? (
              <p className="text-xs text-neutral-500 text-center py-6">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
            ) : historyLogs.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">{t('noHistory')}</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {historyLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-800">
                        {log.fromStatus} → {log.toStatus}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {new Date(log.createdAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </span>
                    </div>
                    {log.moderator && (
                      <p className="text-neutral-600 text-[11px]">
                        {locale === 'vi' ? 'Người duyệt' : 'Reviewer'}: {log.moderator.fullName} ({log.moderator.email})
                      </p>
                    )}
                    {log.reason && (
                      <p className="text-neutral-700 bg-white p-2 rounded border border-neutral-200 text-[11px] mt-1">
                        {log.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryListing(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-100"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModerationTab;
