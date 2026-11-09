import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  // Fetch listing: returns null on genuine 404 (not found or not APPROVED).
  // Throws on network/5xx server errors, propagating to error.tsx boundary.
  const listing = await fetchPublicListingDetail(id);

  if (!listing) {
    notFound();
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

        {/* 1. Property Image Gallery with 65/35 ratio & Lightbox */}
        <PropertyGallery
          images={listing.images}
          title={listing.title}
        />

        {/* 2. Main Content & Sidebar Grid Container */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-16">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left Column (Main Specs & Description) - 65% width */}
            <div className="w-full lg:flex-1 space-y-6">
              {/* Primary Overview Block */}
              <PropertyOverview listing={listing} locale={locale} />

              {/* Verified Specifications Table */}
              <PropertySpecsTable listing={listing} locale={locale} />

              {/* Detailed Description */}
              <PropertyDescription description={listing.description} />

              {/* Privacy-Preserving Geographic Location Notice */}
              <PropertyLocationNotice listing={listing} />
            </div>

            {/* Right Column (Sticky Consultation Card) - 35% width */}
            <PropertyContactCard listing={listing} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
