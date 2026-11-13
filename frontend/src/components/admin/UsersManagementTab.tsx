'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AdminUserItem, Role } from '@/types';

interface UsersManagementTabProps {
  locale: string;
  currentAdminId: string;
}

export function UsersManagementTab({ locale, currentAdminId }: UsersManagementTabProps) {
  const t = useTranslations('AdminPortal.users');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Change Role Modal
  const [roleUser, setRoleUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<Role>('BUYER');
  const [isSubmittingRole, setIsSubmittingRole] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadUsers = async () => {
      try {
        const res = await apiClient.getAdminUsers({
          role: roleFilter === 'ALL' ? undefined : roleFilter,
          isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
          search: searchTerm.trim() || undefined,
          limit: 50,
        });
        if (!ignore) {
          setUsers(res.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiClientError) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage(locale === 'vi' ? 'Không thể tải danh sách người dùng.' : 'Failed to load users list.');
          }
          setIsLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      ignore = true;
    };
  }, [roleFilter, statusFilter, searchTerm, refreshKey, locale]);

  const openRoleModal = (u: AdminUserItem) => {
    setRoleUser(u);
    setNewRole(u.role);
    setRoleError(null);
  };

  const handleConfirmRole = async () => {
    if (!roleUser) return;
    setIsSubmittingRole(true);
    setRoleError(null);
    try {
      await apiClient.updateUserRole(roleUser.id, { role: newRole });
      setRoleUser(null);
      setFeedbackMessage(t('roleUpdateSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setRoleError(err.message);
      } else {
        setRoleError(locale === 'vi' ? 'Lỗi khi cập nhật vai trò.' : 'Error updating role.');
      }
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleToggleStatus = async (u: AdminUserItem) => {
    if (u.id === currentAdminId) {
      alert(t('selfActionForbidden'));
      return;
    }

    try {
      setFeedbackMessage(null);
      await apiClient.updateUserStatus(u.id, { isActive: !u.isActive });
      setFeedbackMessage(t('statusUpdateSuccess'));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      } else {
        alert(locale === 'vi' ? 'Lỗi khi thay đổi trạng thái tài khoản.' : 'Error toggling user status.');
      }
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            {role}
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {role}
          </span>
        );
      case 'OWNER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {role}
          </span>
        );
      case 'BUYER':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="users-management-tab">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              data-testid="user-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-base">
              search
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              data-testid="role-filter-select"
              value={roleFilter}
              onChange={(e) => {
                setIsLoading(true);
                setRoleFilter(e.target.value);
              }}
              className="text-xs p-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="ALL">{t('filterAllRoles')}</option>
              <option value="BUYER">BUYER</option>
              <option value="OWNER">OWNER</option>
              <option value="AGENT">AGENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <select
              data-testid="status-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setIsLoading(true);
                setStatusFilter(e.target.value);
              }}
              className="text-xs p-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="ALL">{t('filterAllStatus')}</option>
              <option value="ACTIVE">{t('active')}</option>
              <option value="INACTIVE">{t('inactive')}</option>
            </select>
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

      {/* Users Table */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-3" />
          <p className="text-sm">{locale === 'vi' ? 'Đang tải người dùng...' : 'Loading users...'}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200 shadow-sm text-neutral-500">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-2">person_off</span>
          <p className="text-sm font-medium">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="p-3.5">{t('fullName')} / {t('email')}</th>
                  <th className="p-3.5">{t('phone')}</th>
                  <th className="p-3.5">{t('registrationIntent')}</th>
                  <th className="p-3.5">{t('assignedRole')}</th>
                  <th className="p-3.5">{t('status')}</th>
                  <th className="p-3.5">{t('createdAt')}</th>
                  <th className="p-3.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => {
                  const isSelf = u.id === currentAdminId;
                  const hasDiscrepancy = Boolean(u.registrationIntent && u.registrationIntent !== u.role);

                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              (Bạn)
                            </span>
                          )}
                        </div>
                        <div className="text-neutral-500 text-[11px]">{u.email}</div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-neutral-600">
                        {u.phone || '—'}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700">
                          {u.registrationIntent}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <div>{getRoleBadge(u.role)}</div>
                          {hasDiscrepancy && (
                            <span
                              data-testid={`intent-discrepancy-${u.id}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                              title={`${t('discrepancyNotice')}: Intent (${u.registrationIntent}) ≠ Role (${u.role})`}
                            >
                              <span className="material-symbols-outlined text-xs">warning</span>
                              <span>{t('discrepancyNotice')}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {u.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            {t('active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                            {t('inactive')}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-neutral-500">
                        {new Date(u.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          data-testid={`change-role-btn-${u.id}`}
                          onClick={() => openRoleModal(u)}
                          disabled={isSelf}
                          title={isSelf ? t('selfActionForbidden') : t('changeRole')}
                          className="px-2.5 py-1 text-xs font-semibold rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t('changeRole')}
                        </button>

                        <button
                          type="button"
                          data-testid={`toggle-status-btn-${u.id}`}
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf}
                          title={isSelf ? t('selfActionForbidden') : (u.isActive ? t('deactivate') : t('activate'))}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.isActive
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? t('deactivate') : t('activate')}
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

      {/* Role Change Modal */}
      {roleUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">{t('roleModalTitle')}</h3>
            <p className="text-xs text-neutral-600">
              Người dùng: <strong className="text-neutral-800">{roleUser.fullName}</strong> ({roleUser.email})
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">{t('roleModalPrompt')}</label>
              <select
                data-testid="role-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="BUYER">BUYER (Người mua)</option>
                <option value="OWNER">OWNER (Chủ sở hữu)</option>
                <option value="AGENT">AGENT (Môi giới)</option>
                <option value="ADMIN">ADMIN (Quản trị viên)</option>
              </select>
            </div>

            {roleError && (
              <p className="text-xs text-red-600">{roleError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleUser(null)}
                disabled={isSubmittingRole}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                data-testid="confirm-role-btn"
                onClick={handleConfirmRole}
                disabled={isSubmittingRole}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingRole ? '...' : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagementTab;
