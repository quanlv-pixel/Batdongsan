'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { ReceivedMlsShareItem } from '@/types/workspace';
import GrantMlsModal from './GrantMlsModal';

interface MlsTabProps {
  locale: string;
}

export function MlsTab({ locale }: MlsTabProps) {
  const t = useTranslations('Workspace.mls');
  const [shares, setShares] = useState<ReceivedMlsShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handlePageChange = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getReceivedMlsShares({ page: targetPage, limit: 10 });
      setShares(res.data);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách tin MLS';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await apiClient.getReceivedMlsShares({ page: 1, limit: 10 });
        if (!ignore) {
          setShares(res.data);
          setPage(res.meta.page);
          setTotalPages(res.meta.totalPages);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Không thể tải danh sách tin MLS';
          setError(msg);
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const formatPrice = (priceVnd: string) => {
    try {
      const val = BigInt(priceVnd);
      if (val >= BigInt(1_000_000_000)) {
        const ty = Number(val) / 1_000_000_000;
        return `${ty.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 })} ${locale === 'vi' ? 'tỷ' : 'Billion'}`;
      }
      if (val >= BigInt(1_000_000)) {
        const tr = Number(val) / 1_000_000;
        return `${tr.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 })} ${locale === 'vi' ? 'triệu' : 'Million'}`;
      }
      return `${val.toLocaleString()} đ`;
    } catch {
      return `${priceVnd} đ`;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{t('heading')}</h2>
          <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsGrantModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('shareModalTitle')}
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : shares.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-neutral-800 mb-1">{t('emptyTitle')}</h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shares.map((share) => {
            const isManage = share.permission === 'MANAGE';
            const listing = share.listing;
            const primaryImage = listing.images && listing.images.length > 0
              ? listing.images[0].url
              : '/images/property-placeholder.svg';

            return (
              <div
                key={share.id}
                data-testid={`mls-share-${share.id}`}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Image and Permission Badge */}
                <div className="relative h-48 w-full bg-neutral-100">
                  <Image
                    src={primaryImage}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={false}
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      data-testid={`mls-badge-${share.id}`}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${
                        isManage
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-sky-100 text-sky-800 border-sky-300'
                      }`}
                    >
                      {isManage ? t('permManage') : t('permView')}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 line-clamp-2 hover:text-primary-600 transition-colors">
                      {listing.title}
                    </h3>
                    
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-primary-600">
                        {formatPrice(listing.priceVnd)}
                      </span>
                      <span className="text-sm text-neutral-400">&bull;</span>
                      <span className="text-sm font-semibold text-neutral-700">
                        {listing.areaSqm} m²
                      </span>
                    </div>

                    {/* Address Section respecting VIEW vs MANAGE */}
                    <div className="mt-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
                      <div className="flex items-start gap-1.5 text-neutral-600">
                        <svg className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          {isManage && listing.streetAddress ? (
                            <div>
                              <span className="font-semibold text-neutral-800">{listing.streetAddress}, </span>
                              <span>{listing.ward ? `${listing.ward}, ` : ''}{listing.district}, {listing.province}</span>
                              <p className="mt-1 font-medium text-emerald-700">{t('manageNotice')}</p>
                            </div>
                          ) : (
                            <div>
                              <span>{listing.ward ? `${listing.ward}, ` : ''}{listing.district}, {listing.province}</span>
                              <p className="mt-1 font-medium text-neutral-500 italic">{t('viewNotice')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="mt-3 text-xs text-neutral-500 space-y-1">
                      <div>
                        <span className="font-medium text-neutral-700">{t('owner')}</span>{' '}
                        <span>{listing.owner.fullName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-neutral-700">{t('expiresAt')}</span>{' '}
                        <span>{share.expiresAt ? formatDate(share.expiresAt) : t('noExpiry')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="px-3 py-1.5 rounded border border-neutral-300 text-sm font-medium text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
          >
            {locale === 'vi' ? 'Trang trước' : 'Previous'}
          </button>
          <span className="text-sm text-neutral-600 font-medium">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="px-3 py-1.5 rounded border border-neutral-300 text-sm font-medium text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
          >
            {locale === 'vi' ? 'Trang sau' : 'Next'}
          </button>
        </div>
      )}

      {/* Modal to share listings */}
      <GrantMlsModal
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        onSuccess={() => {
          setActionSuccess(t('shareSuccess'));
          void handlePageChange(1);
        }}
        locale={locale}
      />
    </div>
  );
}

export default MlsTab;

