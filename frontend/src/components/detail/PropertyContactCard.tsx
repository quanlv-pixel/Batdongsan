'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PublicListingSummary } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useDictionary, useLocalizedHref } from '@/i18n';

interface PropertyContactCardProps {
  listing: PublicListingSummary;
}

export function PropertyContactCard({ listing }: PropertyContactCardProps) {
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [scheduleNotice, setScheduleNotice] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const returnToParam = encodeURIComponent(pathname || `/bat-dong-san/${listing.id}`);
  const loginUrl = localizeHref(`/login?returnTo=${returnToParam}`);
  const registerUrl = localizeHref(`/register?returnTo=${returnToParam}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!consent) {
      setErrorMessage(dict.PropertyDetail.contact.consentRequired);
      return;
    }

    if (message.length > 1000) {
      setErrorMessage('Lời nhắn không được vượt quá 1000 ký tự.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.createContactRequest({
        listingId: listing.id,
        message: message.trim() || undefined,
        contactConsent: true,
      });

      setSubmittedRequestId(response.id);
      setMessage('');
      setConsent(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (
          err.statusCode === 400 &&
          typeof err.message === 'string' &&
          err.message.includes('own listing')
        ) {
          setErrorMessage(dict.PropertyDetail.contact.errorSelfListing);
        } else if (err.statusCode === 403) {
          setErrorMessage(dict.PropertyDetail.contact.errorAdminRole);
        } else {
          setErrorMessage(err.message || dict.PropertyDetail.contact.errorGeneral);
        }
      } else {
        const errorMsg =
          err instanceof Error
            ? err.message
            : dict.PropertyDetail.contact.errorGeneral;
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRequestId(null);
    setErrorMessage(null);
    setMessage('');
    setConsent(false);
  };

  return (
    <aside
      data-testid="property-contact-card"
      className="w-full lg:w-[380px] shrink-0 sticky top-24 space-y-4"
    >
      {/* Primary Consultation Card */}
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm">
        <h2
          data-testid="contact-card-title"
          className="font-display text-xl font-bold text-[#142B4A] mb-1"
        >
          {dict.PropertyDetail.contact.title}
        </h2>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          {dict.PropertyDetail.contact.subtitle}
        </p>

        {/* 1. Unauthenticated State */}
        {!isAuthenticated ? (
          <div data-testid="contact-login-prompt" className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
              <span className="material-symbols-outlined text-[#0F766E] text-xl shrink-0 mt-0.5">
                account_circle
              </span>
              <p>{dict.PropertyDetail.contact.unauthenticatedNotice}</p>
            </div>

            <Link
              data-testid="contact-login-link"
              href={loginUrl}
              className="w-full py-3 px-4 rounded-lg bg-[#0F766E] text-white font-body text-sm font-semibold hover:bg-[#0D655E] transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">login</span>
              <span>{dict.PropertyDetail.contact.loginButton}</span>
            </Link>

            <div className="text-center text-xs text-slate-500 pt-1">
              <span>{dict.PropertyDetail.contact.registerPrompt} </span>
              <Link
                data-testid="contact-register-link"
                href={registerUrl}
                className="text-[#0F766E] font-semibold hover:underline"
              >
                {dict.PropertyDetail.contact.registerLink}
              </Link>
            </div>
          </div>
        ) : isAdmin ? (
          /* 2. Admin Notice State */
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
              shield_person
            </span>
            <div>
              <p className="font-semibold mb-1">
                {dict.Navbar.roles.ADMIN}
              </p>
              <p>{dict.PropertyDetail.contact.errorAdminRole}</p>
            </div>
          </div>
        ) : submittedRequestId ? (
          /* 3. Successful Submission State */
          <div data-testid="contact-success-banner" className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-sm mb-2 text-emerald-800">
                <span className="material-symbols-outlined text-emerald-600">
                  check_circle
                </span>
                <span>{dict.PropertyDetail.contact.successTitle}</span>
              </div>
              <p>
                {dict.PropertyDetail.contact.successMessage.includes('{id}') ? (
                  <>
                    {dict.PropertyDetail.contact.successMessage.split('{id}')[0]}
                    <span
                      data-testid="contact-success-request-id"
                      className="font-mono font-bold"
                    >
                      {submittedRequestId.slice(0, 8).toUpperCase()}
                    </span>
                    {dict.PropertyDetail.contact.successMessage.split('{id}')[1]}
                  </>
                ) : (
                  <>
                    {dict.PropertyDetail.contact.successMessage}{' '}
                    <span
                      data-testid="contact-success-request-id"
                      className="font-mono font-bold"
                    >
                      {submittedRequestId.slice(0, 8).toUpperCase()}
                    </span>
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              data-testid="contact-reset-btn"
              onClick={handleReset}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:border-[#0F766E] hover:text-[#0F766E] transition-all"
            >
              {dict.PropertyDetail.contact.sendAnother}
            </button>
          </div>
        ) : (
          /* 4. Authenticated Consultation Form */
          <form
            data-testid="contact-request-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* User Identity Banner */}
            <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100/60 text-xs text-slate-600 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {dict.PropertyDetail.contact.loggedInAs}
                </span>
                <span className="font-semibold text-[#142B4A] truncate block">
                  {user?.fullName}
                </span>
                <span className="text-[11px] text-slate-500 truncate block">
                  {user?.email}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-teal-200 text-[11px] font-semibold text-[#0F766E] shrink-0">
                {user?.role ? dict.Navbar.roles[user.role] : ''}
              </span>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-normal flex items-start gap-2"
                role="alert"
              >
                <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {dict.PropertyDetail.contact.messageLabel}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {message.length}/1000
                </span>
              </div>
              <textarea
                id="contact-message"
                data-testid="contact-message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder={dict.PropertyDetail.contact.messagePlaceholder}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] resize-none transition-all"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="contact-consent"
                data-testid="contact-consent-checkbox"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E] cursor-pointer"
                required
              />
              <label
                htmlFor="contact-consent"
                className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none"
              >
                {dict.PropertyDetail.contact.consentLabel}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              data-testid="contact-submit-btn"
              disabled={isSubmitting || !consent}
              className="w-full py-3 px-4 rounded-lg bg-[#0F766E] text-white font-body text-sm font-semibold hover:bg-[#0D655E] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{dict.PropertyDetail.contact.submitting}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    send
                  </span>
                  <span>{dict.PropertyDetail.contact.submitButton}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Secondary Action: Schedule Visit */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setScheduleNotice((prev) => !prev)}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:border-[#0F766E] hover:text-[#0F766E] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">
              calendar_month
            </span>
            <span>{dict.PropertyDetail.contact.scheduleVisit}</span>
          </button>
          {scheduleNotice && (
            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              {dict.PropertyDetail.contact.scheduleVisitNotice}
            </div>
          )}
        </div>

        {/* Privacy Shield Guarantee Box */}
        <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[#0F766E] text-lg shrink-0 mt-0.5">
            verified_user
          </span>
          <p className="leading-normal">
            {dict.PropertyDetail.contact.privacyGuarantee}
          </p>
        </div>
      </div>
    </aside>
  );
}
