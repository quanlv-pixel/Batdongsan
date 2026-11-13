'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDictionary, useLocalizedHref, useLocale } from '@/i18n';
import { apiClient } from '@/lib/api-client';
import { formatVndPrice, formatArea } from '@/lib/formatters';
import { ListingStatus, MyListingItem } from '@/types';
import { CreateListingModal } from './CreateListingModal';
import { GrantMlsModal } from './GrantMlsModal';

interface MyListingsTabProps {
  userRole?: string;
  locale?: string;
}

export function MyListingsTab({ userRole, locale: propLocale }: MyListingsTabProps) {
  const dict = useDictionary();
  const contextLocale = useLocale();
  const locale = propLocale || contextLocale;
  const localizeHref = useLocalizedHref();

  const [listings, setListings] = useState<MyListingItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modal controls
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetListingId, setShareTargetListingId] = useState<string | undefined>();
  const [submittingListingId, setSubmittingListingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await apiClient.getMyListings({
          status: selectedStatus && selectedStatus !== 'ALL' ? selectedStatus : undefined,
          limit: 50,
        });
        if (!ignore) {
          setListings(res.data || []);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách tin đăng';
          setErrorMessage(msg);
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [selectedStatus]);

  const handleSubmitForApproval = async (id: string) => {
    setSubmittingListingId(id);
    setActionNotice(null);
    try {
      await apiClient.submitListing(id);
      setActionNotice(dict.Workspace.myListings.submittedSuccess);
      // Optimistically update status to PENDING
      setListings((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'PENDING' as ListingStatus } : item,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi duyệt tin đăng';
      setErrorMessage(msg);
    } finally {
      setSubmittingListingId(null);
    }
  };

  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            data-testid="listing-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {dict.Workspace.myListings.statusApproved}
          </span>
        );
      case 'PENDING':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
            data-testid="listing-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            {dict.Workspace.myListings.statusPending}
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
            data-testid="listing-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {dict.Workspace.myListings.statusRejected}
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            data-testid="listing-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {dict.Workspace.myListings.statusDraft}
          </span>
        );
    }
  };

  const approvedListings = listings.filter((l) => l.status === 'APPROVED');

  return (
    <div className="space-y-6" data-testid="my-listings-tab-container">
      {/* Tab Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-[#142B4A]">
            {dict.Workspace.myListings.heading}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {dict.Workspace.myListings.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.99]"
          data-testid="create-listing-btn"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>{dict.Workspace.myListings.createButton}</span>
        </button>
      </div>

      {/* Action Success / Error Notifications */}
      {actionNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs flex items-center justify-between gap-2"
          data-testid="listing-action-success"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-teal-700 hover:text-teal-900"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2"
          data-testid="listing-action-error"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'ALL', label: dict.Workspace.myListings.statusAll },
          { key: 'DRAFT', label: dict.Workspace.myListings.statusDraft },
          { key: 'PENDING', label: dict.Workspace.myListings.statusPending },
          { key: 'APPROVED', label: dict.Workspace.myListings.statusApproved },
          { key: 'REJECTED', label: dict.Workspace.myListings.statusRejected },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedStatus === tab.key
                ? 'bg-[#142B4A] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            data-testid={`status-filter-${tab.key.toLowerCase()}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <span className="material-symbols-outlined text-3xl animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs">Đang tải danh sách tin đăng...</p>
        </div>
      ) : listings.length === 0 ? (
        <div
          className="p-12 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50"
          data-testid="empty-listings-state"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">post_add</span>
          </div>
          <h3 className="text-sm font-bold text-[#142B4A]">
            {dict.Workspace.myListings.emptyTitle}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {dict.Workspace.myListings.emptyDescription}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D655E] transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>{dict.Workspace.myListings.createButton}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4" data-testid="my-listings-list">
          {listings.map((item) => {
            const hasRejection =
              item.status === 'REJECTED' &&
              item.moderationLogs &&
              item.moderationLogs.length > 0 &&
              item.moderationLogs[0].reason;

            const canSubmit = item.status === 'DRAFT' || item.status === 'REJECTED';
            const isSubmitting = submittingListingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                data-testid={`my-listing-card-${item.id}`}
              >
                {/* Top Row: Title, Badges & Price */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(item.status)}
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {item.transactionType === 'FOR_SALE' ? 'Mua bán' : 'Cho thuê'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500">
                        {item.propertyType}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#142B4A] hover:text-[#0F766E] transition-colors leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-slate-400">
                        location_on
                      </span>
                      <span>
                        {[item.ward, item.district, item.province]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </p>
                  </div>

                  {/* Price & Area Summary */}
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-base font-bold text-[#0F766E]">
                      {formatVndPrice(item.priceVnd, { locale: locale === 'en' ? 'en' : 'vi' })}
                      {item.rentalPeriod ? ` / ${item.rentalPeriod.toLowerCase()}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {formatArea(item.areaSqm, locale === 'en' ? 'en' : 'vi')}
                    </div>
                  </div>
                </div>

                {/* Rejection Alert Notice if applicable */}
                {hasRejection && (
                  <div
                    className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1"
                    data-testid="moderation-rejection-alert"
                  >
                    <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <span>{dict.Workspace.myListings.rejectionReasonTitle}</span>
                    </div>
                    <p className="leading-relaxed pl-5">
                      {item.moderationLogs![0].reason}
                    </p>
                  </div>
                )}

                {/* Bottom Row: Actions & Timestamps */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400">
                    {dict.Workspace.myListings.updatedAt}{' '}
                    {new Date(item.updatedAt).toLocaleDateString(
                      locale === 'vi' ? 'vi-VN' : 'en-US',
                    )}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Public Listing if Approved */}
                    {item.status === 'APPROVED' && (
                      <Link
                        href={localizeHref(`/bat-dong-san/${item.id}`)}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:text-[#0F766E] transition-colors"
                        data-testid="view-public-listing-link"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>{dict.Workspace.myListings.viewPublic}</span>
                      </Link>
                    )}

                    {/* Share MLS Button for Approved Listings */}
                    {item.status === 'APPROVED' && (userRole === 'AGENT' || userRole === 'OWNER') && (
                      <button
                        type="button"
                        onClick={() => {
                          setShareTargetListingId(item.id);
                          setIsShareModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/50 text-[#0F766E] font-medium hover:bg-teal-50 transition-colors"
                        data-testid={`share-mls-btn-${item.id}`}
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                        <span>{dict.Workspace.myListings.shareMls}</span>
                      </button>
                    )}

                    {/* Submit for Approval Action */}
                    {canSubmit && (
                      <button
                        type="button"
                        onClick={() => handleSubmitForApproval(item.id)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0D655E] transition-all shadow-2xs disabled:opacity-50"
                        data-testid={`submit-listing-btn-${item.id}`}
                      >
                        {isSubmitting ? (
                          <span className="material-symbols-outlined text-sm animate-spin">
                            progress_activity
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">send</span>
                        )}
                        <span>
                          {isSubmitting
                            ? dict.Workspace.myListings.submitting
                            : dict.Workspace.myListings.submitForApproval}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(created) => {
          setListings((prev) => [created, ...prev]);
          setActionNotice('Đã tạo tin đăng thành công!');
        }}
      />

      {/* Grant MLS Share Modal */}
      <GrantMlsModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareTargetListingId(undefined);
        }}
        approvedListings={approvedListings}
        preselectedListingId={shareTargetListingId}
        onSuccess={() => {
          setActionNotice('Đã cấp quyền chia sẻ MLS thành công!');
        }}
      />
    </div>
  );
}

export default MyListingsTab;

