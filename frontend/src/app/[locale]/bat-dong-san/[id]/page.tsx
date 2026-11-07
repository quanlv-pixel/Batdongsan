import React from 'react';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { resolveLocale, localizePath } from '@/i18n/routing';
import { getDictionary } from '@/i18n/dictionaries';
import { fetchPublicListingDetail } from '@/lib/public-listings';
import { getPropertyTypeLabel } from '@/lib/formatters';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PropertyGallery } from '@/components/detail/PropertyGallery';
import { PropertyOverview } from '@/components/detail/PropertyOverview';
import { PropertyDescription } from '@/components/detail/PropertyDescription';
import { PropertySpecsTable } from '@/components/detail/PropertySpecsTable';
import { PropertyLocationNotice } from '@/components/detail/PropertyLocationNotice';
import { PropertyContactCard } from '@/components/detail/PropertyContactCard';

export const instant = false;

interface PropertyDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const dict = getDictionary(locale);

  let listing = null;
  try {
    listing = await fetchPublicListingDetail(id);
  } catch {
    listing = null;
  }

  // Localized 404 / Not Found State
  if (!listing) {
    return (
      <div className="flex flex-col min-h-screen justify-between bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 py-12 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb back to search */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-8"
            >
              <Link
                href={localizePath('/', locale)}
                className="hover:text-[#0F766E] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">home</span>
                <span>{dict.PropertyDetail.breadcrumb.home}</span>
              </Link>
              <span className="text-slate-300">/</span>
              <Link
                href={localizePath('/bat-dong-san', locale)}
                className="hover:text-[#0F766E] transition-colors"
              >
                {dict.SearchResults.breadcrumb.searchResults}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-medium">404</span>
            </nav>

            {/* Not Found Card */}
            <div
              data-testid="detail-not-found-container"
              className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 text-center shadow-sm"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">
                  search_off
                </span>
              </div>
              <h1
                data-testid="detail-not-found-title"
                className="text-2xl font-bold text-[#142B4A] mb-3"
              >
                {dict.PropertyDetail.states.notFoundTitle}
              </h1>
              <p
                data-testid="detail-not-found-description"
                className="text-slate-600 text-sm max-w-md mx-auto mb-8 leading-relaxed"
              >
                {dict.PropertyDetail.states.notFoundDescription}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  data-testid="detail-not-found-back-btn"
                  href={localizePath('/bat-dong-san', locale)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D655E] transition-colors shadow-sm"
                >
                  {dict.PropertyDetail.states.backToSearch}
                </Link>
                <Link
                  href={localizePath('/', locale)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  {dict.PropertyDetail.states.backToHome}
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const transactionLabel =
    listing.transactionType === 'FOR_SALE'
      ? dict.PropertyDetail.breadcrumb.forSale
      : dict.PropertyDetail.breadcrumb.forRent;
  const propertyTypeLabel = getPropertyTypeLabel(listing.propertyType, locale);

  return (
    <div className="flex flex-col min-h-screen justify-between bg-[#F8FAFC]">
      <Navbar />

      <main className="flex-1">
        {/* Breadcrumb & Watermark Status Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Breadcrumb Navigation */}
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500"
            >
              <Link
                href={localizePath('/', locale)}
                className="hover:text-[#0F766E] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">home</span>
                <span>{dict.PropertyDetail.breadcrumb.home}</span>
              </Link>
              <span className="text-slate-300">/</span>
              <Link
                href={localizePath(
                  `/bat-dong-san?transactionType=${listing.transactionType}`,
                  locale,
                )}
                className="hover:text-[#0F766E] transition-colors"
              >
                {transactionLabel}
              </Link>
              <span className="text-slate-300">/</span>
              <Link
                href={localizePath(
                  `/bat-dong-san?transactionType=${listing.transactionType}&propertyType=${listing.propertyType}`,
                  locale,
                )}
                className="hover:text-[#0F766E] transition-colors"
              >
                {propertyTypeLabel}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-[#142B4A] font-medium truncate max-w-xs sm:max-w-md">
                {listing.title}
              </span>
            </nav>

            {/* Watermark / Moderation Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
              <span className="material-symbols-outlined text-sm text-[#0F766E]">
                verified
              </span>
              <span>{dict.PropertyDetail.watermark.badge}</span>
            </div>
          </div>
        </section>

        {/* Property Gallery */}
        <PropertyGallery images={listing.images} title={listing.title} />

        {/* Main Content Layout (2 Columns: Detail Left + Sticky Contact Right) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-16 flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column (Primary Details) */}
          <div className="w-full lg:flex-1 space-y-6">
            <PropertyOverview listing={listing} locale={locale} />
            <PropertyDescription description={listing.description} />
            <PropertySpecsTable listing={listing} locale={locale} />
            <PropertyLocationNotice listing={listing} />
          </div>

          {/* Right Column (Contact & Consultation Sticky Sidebar) */}
          <PropertyContactCard listing={listing} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
