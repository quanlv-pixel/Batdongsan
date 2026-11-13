'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDictionary, useLocalizedHref, useLocale } from '@/i18n';
import { apiClient } from '@/lib/api-client';
import { formatVndPrice } from '@/lib/formatters';
import { AssignedLeadItem, ContactRequestStatus } from '@/types';

interface AssignedLeadsTabProps {
  locale?: string;
}

export function AssignedLeadsTab({ locale: propLocale }: AssignedLeadsTabProps = {}) {
  const dict = useDictionary();
  const contextLocale = useLocale();
  const locale = propLocale || contextLocale;
  const localizeHref = useLocalizedHref();

  const [leads, setLeads] = useState<AssignedLeadItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reject dialog state
  const [rejectingLeadId, setRejectingLeadId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await apiClient.getAssignedContactRequests({
          status: selectedStatus && selectedStatus !== 'ALL' ? selectedStatus : undefined,
          limit: 50,
        });
        if (!ignore) {
          setLeads(res.data || []);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách khách hàng';
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

  const handleUpdateStatus = async (
    id: string,
    status: ContactRequestStatus,
    note?: string,
  ) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    try {
      await apiClient.updateContactRequestStatus(id, status, note);
      setSuccessNotice(dict.Workspace.leads.statusUpdated);
      // Optimistically update status
      setLeads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      setRejectingLeadId(null);
      setRejectReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ContactRequestStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            data-testid="lead-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {dict.Workspace.leads.filterCompleted}
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
            data-testid="lead-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {dict.Workspace.leads.filterRejected}
          </span>
        );
      case 'IN_PROGRESS':
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            data-testid="lead-status-badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            {dict.Workspace.leads.filterInProgress}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="assigned-leads-tab-container">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-[#142B4A]">
            {dict.Workspace.leads.heading}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {dict.Workspace.leads.subtitle}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs flex items-center justify-between gap-2"
          data-testid="lead-action-success"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
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
          data-testid="lead-action-error"
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'ALL', label: dict.Workspace.leads.filterAll },
          { key: 'IN_PROGRESS', label: dict.Workspace.leads.filterInProgress },
          { key: 'COMPLETED', label: dict.Workspace.leads.filterCompleted },
          { key: 'REJECTED', label: dict.Workspace.leads.filterRejected },
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
            data-testid={`lead-filter-${tab.key.toLowerCase()}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <span className="material-symbols-outlined text-3xl animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs">Đang tải danh sách khách hàng...</p>
        </div>
      ) : leads.length === 0 ? (
        <div
          className="p-12 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50"
          data-testid="empty-leads-state"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">support_agent</span>
          </div>
          <h3 className="text-sm font-bold text-[#142B4A]">
            {dict.Workspace.leads.emptyTitle}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {dict.Workspace.leads.emptyDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="assigned-leads-list">
          {leads.map((item) => {
            const isTerminal =
              item.status === 'COMPLETED' || item.status === 'REJECTED';
            const isRejecting = rejectingLeadId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4"
                data-testid={`assigned-lead-card-${item.id}`}
              >
                {/* Header: Status, ID & Date */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-xs font-mono text-slate-400">
                      #{item.id}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString(
                      locale === 'vi' ? 'vi-VN' : 'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </span>
                </div>

                {/* Client Info & Consent Verification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Buyer Contact Details */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#142B4A]">
                        {item.buyer.fullName}
                      </span>
                      {item.contactConsent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          {dict.Workspace.leads.consentGranted}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <span className="material-symbols-outlined text-xs">privacy_tip</span>
                          {dict.Workspace.leads.consentDenied}
                        </span>
                      )}
                    </div>

                    {item.contactConsent ? (
                      <div className="space-y-1 text-xs text-slate-600">
                        {item.buyer.phone && (
                          <div className="flex items-center gap-2" data-testid="lead-phone">
                            <span className="material-symbols-outlined text-sm text-[#0F766E]">
                              call
                            </span>
                            <a
                              href={`tel:${item.buyer.phone}`}
                              className="font-medium text-[#0F766E] hover:underline"
                            >
                              {item.buyer.phone}
                            </a>
                          </div>
                        )}
                        {item.buyer.email && (
                          <div className="flex items-center gap-2" data-testid="lead-email">
                            <span className="material-symbols-outlined text-sm text-[#0F766E]">
                              mail
                            </span>
                            <a
                              href={`mailto:${item.buyer.email}`}
                              className="hover:underline"
                            >
                              {item.buyer.email}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        {dict.Workspace.leads.consentDenied}
                      </p>
                    )}

                    {item.message && (
                      <div className="pt-2 border-t border-slate-200/60 text-xs">
                        <span className="font-semibold text-slate-700 block mb-0.5">
                          {dict.Workspace.leads.message}
                        </span>
                        <p className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          &ldquo;{item.message}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Associated Listing */}
                  {item.listing && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {dict.Workspace.leads.interestedListing}
                        </span>
                        <Link
                          href={localizeHref(`/bat-dong-san/${item.listing.id}`)}
                          target="_blank"
                          className="text-xs font-bold text-[#142B4A] hover:text-[#0F766E] transition-colors line-clamp-2"
                        >
                          {item.listing.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-[#0F766E]">
                          <span>{formatVndPrice(item.listing.priceVnd, { locale: locale === 'en' ? 'en' : 'vi' })}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-normal">
                            {[item.listing.district, item.listing.province]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 text-right">
                        <Link
                          href={localizeHref(`/bat-dong-san/${item.listing.id}`)}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline"
                        >
                          <span>Xem tin đăng</span>
                          <span className="material-symbols-outlined text-xs">
                            arrow_outward
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Bar for IN_PROGRESS Leads */}
                {!isTerminal && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
                    {isRejecting ? (
                      <div className="w-full flex flex-col sm:flex-row items-center gap-2 bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={dict.Workspace.leads.rejectPlaceholder}
                          className="w-full sm:flex-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-rose-400"
                          data-testid="reject-reason-input"
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingLeadId(null);
                              setRejectReason('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            {dict.Workspace.leads.cancel}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(item.id, 'REJECTED', rejectReason)
                            }
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-2xs disabled:opacity-50"
                            data-testid={`confirm-reject-lead-btn-${item.id}`}
                          >
                            {dict.Workspace.leads.confirm}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectingLeadId(item.id)}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 hover:border-rose-200 transition-colors"
                          data-testid={`reject-lead-btn-${item.id}`}
                        >
                          {dict.Workspace.leads.actionReject}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'COMPLETED')}
                          disabled={isProcessing}
                          className="px-4 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D655E] transition-all shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                          data-testid={`complete-lead-btn-${item.id}`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            check_circle
                          </span>
                          <span>{dict.Workspace.leads.actionComplete}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AssignedLeadsTab;

