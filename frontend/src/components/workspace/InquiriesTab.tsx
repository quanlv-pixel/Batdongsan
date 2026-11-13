'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { InquiryItem } from '@/types/workspace';
import { ContactRequestStatus } from '@/types';

interface InquiriesTabProps {
  locale: string;
}

export function InquiriesTab({ locale }: InquiriesTabProps) {
  const t = useTranslations('Workspace.inquiries');
  const tLeads = useTranslations('Workspace.leads');
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handlePageChange = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getInquiriesForOwnedListings({ page: targetPage, limit: 10 });
      setInquiries(res.data);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách yêu cầu tư vấn';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await apiClient.getInquiriesForOwnedListings({ page: 1, limit: 10 });
        if (!ignore) {
          setInquiries(res.data);
          setPage(res.meta.page);
          setTotalPages(res.meta.totalPages);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Không thể tải danh sách yêu cầu tư vấn';
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

  const getStatusBadge = (status: ContactRequestStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            {tLeads('statusNew')}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            {tLeads('statusInProgress')}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {tLeads('statusCompleted')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            {tLeads('statusRejected')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-5">
        <h2 className="text-xl font-bold text-neutral-900">{t('heading')}</h2>
        <p className="text-sm text-neutral-500 mt-1">{t('subtitle')}</p>
      </div>

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
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-neutral-800 mb-1">{t('emptyTitle')}</h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              data-testid={`inquiry-item-${inquiry.id}`}
              className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      ID: {inquiry.id.slice(0, 8)}...
                    </span>
                    {getStatusBadge(inquiry.status)}
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">
                    <Link
                      href={`/${locale}/bat-dong-san/${inquiry.listing.id}`}
                      className="hover:text-primary-600 transition-colors"
                    >
                      {inquiry.listing.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {inquiry.listing.ward ? `${inquiry.listing.ward}, ` : ''}
                    {inquiry.listing.district}, {inquiry.listing.province}
                  </p>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <div className="text-xs text-neutral-500 font-medium">
                    {t('receivedDate')}
                  </div>
                  <div className="text-xs font-semibold text-neutral-700 mt-0.5">
                    {formatDate(inquiry.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}

export default InquiriesTab;

