'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  AdminContactRequestItem,
  AdminAgentOption,
  RequestAssignmentHistoryItem,
} from '@/types';

interface AdminRequestsTabProps {
  locale: string;
}

export function AdminRequestsTab({ locale }: AdminRequestsTabProps) {
  const t = useTranslations('AdminPortal.requests');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [requests, setRequests] = useState<AdminContactRequestItem[]>([]);
  const [agents, setAgents] = useState<AdminAgentOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Assign modal state
  const [assigningRequest, setAssigningRequest] = useState<AdminContactRequestItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [assignmentNote, setAssignmentNote] = useState<string>('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState<boolean>(false);

  // Reassign modal state
  const [reassigningRequest, setReassigningRequest] = useState<AdminContactRequestItem | null>(null);
  const [newAgentId, setNewAgentId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [isSubmittingReassign, setIsSubmittingReassign] = useState<boolean>(false);

  // Reopen modal state
  const [reopeningRequest, setReopeningRequest] = useState<AdminContactRequestItem | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isSubmittingReopen, setIsSubmittingReopen] = useState<boolean>(false);

  // History modal state
  const [historyRequest, setHistoryRequest] = useState<AdminContactRequestItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<RequestAssignmentHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Load active agents for dropdowns
  useEffect(() => {
    let ignore = false;
    apiClient
      .getAdminAgents()
      .then((data) => {
        if (!ignore) setAgents(data);
      })
      .catch((err) => console.error('Failed to load active agents', err));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadRequests = async () => {
      try {
        const res = await apiClient.getAdminContactRequests({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          unassigned: unassignedOnly ? true : undefined,
          limit: 50,
        });
        if (!ignore) {
          setRequests(res.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage(locale === 'vi' ? 'Không thể tải danh sách yêu cầu liên hệ.' : 'Failed to load contact requests.');
          }
          setIsLoading(false);
        }
      }
    };

    loadRequests();
    return () => {
      ignore = true;
    };
  }, [statusFilter, unassignedOnly, refreshKey, locale]);

  // First Assign Handler
  const openAssignModal = (req: AdminContactRequestItem) => {
    setAssigningRequest(req);
    setSelectedAgentId(agents[0]?.id || '');
    setAssignmentNote('');
    setAssignError(null);
  };

  const handleConfirmAssign = async () => {
    if (!assigningRequest) return;
    if (!selectedAgentId) {
      setAssignError(t('agentRequired'));
      return;
    }

    setIsSubmittingAssign(true);
    setAssignError(null);
    try {
      await apiClient.assignContactRequest(assigningRequest.id, {
        agentId: selectedAgentId,
        note: assignmentNote.trim() || undefined,
      });
      setAssigningRequest(null);
      setFeedbackMessage(t('assignSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setAssignError(err.message);
      } else {
        setAssignError(locale === 'vi' ? 'Lỗi khi phân công môi giới.' : 'Error assigning agent.');
      }
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Reassign Handler
  const openReassignModal = (req: AdminContactRequestItem) => {
    setReassigningRequest(req);
    const activeAssignment = req.assignments?.find((a) => a.isActive);
    const otherAgents = agents.filter((a) => a.id !== activeAssignment?.agentId);
    setNewAgentId(otherAgents[0]?.id || '');
    setReassignReason('');
    setReassignError(null);
  };

  const handleConfirmReassign = async () => {
    if (!reassigningRequest) return;
    if (!newAgentId) {
      setReassignError(t('agentRequired'));
      return;
    }
    if (!reassignReason.trim()) {
      setReassignError(t('reasonRequired'));
      return;
    }

    setIsSubmittingReassign(true);
    setReassignError(null);
    try {
      await apiClient.reassignContactRequest(reassigningRequest.id, {
        newAgentId,
        reason: reassignReason.trim(),
      });
      setReassigningRequest(null);
      setFeedbackMessage(t('reassignSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setReassignError(err.message);
      } else {
        setReassignError(locale === 'vi' ? 'Lỗi khi chuyển giao môi giới.' : 'Error reassigning agent.');
      }
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  // Reopen Handler
  const openReopenModal = (req: AdminContactRequestItem) => {
    setReopeningRequest(req);
    setReopenReason('');
    setReopenError(null);
  };

  const handleConfirmReopen = async () => {
    if (!reopeningRequest) return;
    if (!reopenReason.trim()) {
      setReopenError(t('reasonRequired'));
      return;
    }

    setIsSubmittingReopen(true);
    setReopenError(null);
    try {
      await apiClient.reopenContactRequest(reopeningRequest.id, {
        reason: reopenReason.trim(),
      });
      setReopeningRequest(null);
      setFeedbackMessage(t('reopenSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setReopenError(err.message);
      } else {
        setReopenError(locale === 'vi' ? 'Lỗi khi mở lại yêu cầu.' : 'Error reopening request.');
      }
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  // History Handler
  const openHistoryModal = async (req: AdminContactRequestItem) => {
    setHistoryRequest(req);
    setIsLoadingHistory(true);
    try {
      const logs = await apiClient.getContactRequestAssignments(req.id);
      setHistoryLogs(logs);
    } catch (err) {
      console.error('Failed to load assignment history', err);
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {status}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            {status}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {status}
          </span>
        );
      case 'REJECTED':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-requests-tab">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: t('filterAll') },
              { key: 'NEW', label: t('filterNew') },
              { key: 'IN_PROGRESS', label: t('filterInProgress') },
              { key: 'COMPLETED', label: t('filterCompleted') },
              { key: 'REJECTED', label: t('filterRejected') },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                data-testid={`request-filter-${f.key.toLowerCase()}`}
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

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-700">
            <input
              type="checkbox"
              data-testid="filter-unassigned"
              checked={unassignedOnly}
              onChange={(e) => {
                setIsLoading(true);
                setUnassignedOnly(e.target.checked);
              }}
              className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span>{t('filterUnassigned')}</span>
          </label>
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

      {/* Requests Table */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-3" />
          <p className="text-sm">{locale === 'vi' ? 'Đang tải danh sách yêu cầu...' : 'Loading contact requests...'}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200 shadow-sm text-neutral-500">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-2">inbox</span>
          <p className="text-sm font-medium">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="p-3.5">{t('buyerLabel')}</th>
                  <th className="p-3.5">{t('listingLabel')}</th>
                  <th className="p-3.5">{t('assignedTo')}</th>
                  <th className="p-3.5">{t('status')}</th>
                  <th className="p-3.5">Thời gian gửi</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {requests.map((req) => {
                  const activeAssignment = req.assignments?.find((a) => a.isActive);
                  const isTerminal = req.status === 'COMPLETED' || req.status === 'REJECTED';

                  return (
                    <tr key={req.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-neutral-900">{req.buyer.fullName}</div>
                        <div className="text-neutral-500 text-[11px]">{req.buyer.email}</div>
                        {req.buyer.phone && (
                          <div className="text-neutral-500 text-[11px]">{req.buyer.phone}</div>
                        )}
                        {req.message && (
                          <div className="text-neutral-600 text-[11px] mt-1 bg-neutral-50 p-1.5 rounded border border-neutral-200 line-clamp-2">
                            &ldquo;{req.message}&rdquo;
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-medium text-neutral-900 max-w-xs truncate" title={req.listing.title}>
                          {req.listing.title}
                        </div>
                        <div className="text-neutral-500 text-[11px]">
                          {req.listing.district}, {req.listing.province}
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {activeAssignment ? (
                          <div>
                            <span className="font-medium text-primary-700">
                              {activeAssignment.agent.fullName}
                            </span>
                            <div className="text-neutral-400 text-[10px]">
                              {activeAssignment.agent.email}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-600">
                            {t('unassigned')}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {getStatusBadge(req.status)}
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-neutral-500">
                        {new Date(req.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                        {!isTerminal && !activeAssignment && (
                          <button
                            type="button"
                            data-testid={`assign-btn-${req.id}`}
                            onClick={() => openAssignModal(req)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            {t('assignAction')}
                          </button>
                        )}

                        {!isTerminal && activeAssignment && (
                          <button
                            type="button"
                            data-testid={`reassign-btn-${req.id}`}
                            onClick={() => openReassignModal(req)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                          >
                            {t('reassignAction')}
                          </button>
                        )}

                        {isTerminal && (
                          <button
                            type="button"
                            data-testid={`reopen-btn-${req.id}`}
                            onClick={() => openReopenModal(req)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                          >
                            {t('reopenAction')}
                          </button>
                        )}

                        <button
                          type="button"
                          data-testid={`history-btn-${req.id}`}
                          onClick={() => openHistoryModal(req)}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                          {t('historyAction')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">{t('assignModalTitle')}</h3>
            <p className="text-xs text-neutral-600">
              Yêu cầu từ: <strong className="text-neutral-800">{assigningRequest.buyer.fullName}</strong> cho tin: <em className="text-neutral-800">{assigningRequest.listing.title}</em>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Chọn môi giới</label>
              <select
                data-testid="agent-select"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.fullName} ({ag.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Ghi chú (tùy chọn)</label>
              <textarea
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder={t('notePlaceholder')}
                rows={2}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {assignError && (
              <p className="text-xs text-red-600">{assignError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssigningRequest(null)}
                disabled={isSubmittingAssign}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="confirm-assign-btn"
                onClick={handleConfirmAssign}
                disabled={isSubmittingAssign}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingAssign ? '...' : t('assignAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassigningRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">{t('reassignModalTitle')}</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Chọn môi giới mới</label>
              <select
                data-testid="agent-select"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.fullName} ({ag.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Lý do chuyển giao (bắt buộc)</label>
              <textarea
                data-testid="reason-input"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                rows={2}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {reassignError && (
              <p className="text-xs text-red-600">{reassignError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassigningRequest(null)}
                disabled={isSubmittingReassign}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="confirm-reassign-btn"
                onClick={handleConfirmReassign}
                disabled={isSubmittingReassign}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingReassign ? '...' : t('reassignAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {reopeningRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">{t('reopenModalTitle')}</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Lý do mở lại yêu cầu (bắt buộc)</label>
              <textarea
                data-testid="reason-input"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                rows={3}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {reopenError && (
              <p className="text-xs text-red-600">{reopenError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReopeningRequest(null)}
                disabled={isSubmittingReopen}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="confirm-reopen-btn"
                onClick={handleConfirmReopen}
                disabled={isSubmittingReopen}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingReopen ? '...' : t('reopenAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">{t('historyModalTitle')}</h3>
              <button
                onClick={() => setHistoryRequest(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {isLoadingHistory ? (
              <p className="text-xs text-neutral-500 text-center py-6">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
            ) : historyLogs.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">Chưa có lịch sử phân công.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {historyLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-800">
                        {log.agent.fullName} ({log.agent.email})
                      </span>
                      {log.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Đang phụ trách
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-200 text-neutral-600">
                          Đã chuyển giao
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-500 text-[11px]">
                      Phân công lúc: {new Date(log.assignedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                    </p>
                    {log.releasedAt && (
                      <p className="text-neutral-400 text-[10px]">
                        Kết thúc lúc: {new Date(log.releasedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryRequest(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRequestsTab;
