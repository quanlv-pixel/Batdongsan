import React from 'react';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { ListingCard } from '@/components/home/ListingCard';
import { SearchQuickBar } from '@/components/search/SearchQuickBar';
import { SearchFilterSidebar } from '@/components/search/SearchFilterSidebar';
import { MobileFilterDrawer } from '@/components/search/MobileFilterDrawer';
import { SearchResultsHeader } from '@/components/search/SearchResultsHeader';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { SearchErrorState } from '@/components/search/SearchErrorState';
import { SearchPagination } from '@/components/search/SearchPagination';
import { fetchPublicListings } from '@/lib/public-listings';
import { parseListingsSearchParams } from '@/lib/formatters';
import { AppLocaleProvider } from '@/i18n';
import { getDictionary } from '@/i18n/dictionaries';
import { AppLocale, DEFAULT_LOCALE, resolveLocale } from '@/i18n/routing';
import { PublicListingsQuery, PublicListingsResponse } from '@/types';

export const instant = false;

interface SearchResultsViewProps {
  query: PublicListingsQuery;
  response: PublicListingsResponse | null;
  errorMessage: string | null;
  locale?: AppLocale;
}

export function SearchResultsView({
  query,
  response,
  errorMessage,
  locale = DEFAULT_LOCALE,
}: SearchResultsViewProps) {
  const dict = getDictionary(locale);

  // Breadcrumb segment
  const breadcrumbCategory =
    query.transactionType === 'FOR_SALE'
      ? dict.SearchResults.breadcrumb.forSale
      : query.transactionType === 'FOR_RENT'
        ? dict.SearchResults.breadcrumb.forRent
        : dict.SearchResults.breadcrumb.searchResults;

  const total = response?.meta?.total ?? 0;
  const page = response?.meta?.page ?? 1;
  const totalPages = response?.meta?.totalPages ?? 1;
  const listings = response?.data ?? [];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] text-[#142B4A]">
      <Navbar />

      <main className="flex-grow">
        {/* Top Header & Breadcrumb & Quick Search Bar */}
        <section className="bg-[#F1F5F9] border-b border-[#E2E8F0] py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-[#64748B] mb-2 font-medium"
            >
              <Link
                href={`/${locale}`}
                className="hover:text-[#0F766E] transition-colors"
              >
                {dict.SearchResults.breadcrumb.home}
              </Link>
              <span className="material-symbols-outlined text-sm leading-none">
                chevron_right
              </span>
              <span className="text-[#0F172A]">{breadcrumbCategory}</span>
            </nav>

            {/* Page Heading & Approved Listings Badge */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#142B4A]">
                {dict.SearchResults.pageTitle}
              </h1>
              <div
                data-testid="search-approved-badge"
                className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] text-[#64748B] text-xs font-medium px-2.5 py-1 rounded-full shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm text-[#0F766E]">
                  verified
                </span>
                <span>{dict.SearchResults.demoBadge}</span>
              </div>
            </div>

            {/* Quick Search Bar */}
            <SearchQuickBar currentQuery={query} />
          </div>
        </section>

        {/* Main 2-Column Section */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Mobile Filter Drawer Toggle */}
          <MobileFilterDrawer currentQuery={query} />

          {/* Left Column: Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-[310px] flex-shrink-0 sticky top-24">
            <SearchFilterSidebar
              key={JSON.stringify(query)}
              currentQuery={query}
            />
          </aside>

          {/* Right Column: Results Section */}
          <section className="flex-1 min-w-0 w-full">
            <SearchResultsHeader total={total} currentQuery={query} />

            {errorMessage ? (
              <SearchErrorState message={errorMessage} />
            ) : listings.length === 0 ? (
              <SearchEmptyState />
            ) : (
              <>
                <div
                  data-testid="search-results-list"
                  className="space-y-4"
                >
                  {listings.map((item, idx) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      variant="horizontal"
                      priority={idx === 0}
                    />
                  ))}
                </div>

                <SearchPagination
                  page={page}
                  totalPages={totalPages}
                  currentQuery={query}
                />
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default async function SearchResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);

  const rawSearchParams = await searchParams;
  const query = parseListingsSearchParams(rawSearchParams);
  // Default to 10 listings per page if limit not specified
  if (!query.limit) {
    query.limit = 10;
  }

  let response: PublicListingsResponse | null = null;
  let errorMessage: string | null = null;

  try {
    response = await fetchPublicListings(query);
  } catch (err: unknown) {
    const dict = getDictionary(locale);
    errorMessage =
      err instanceof Error ? err.message : dict.SearchResults.states.errorDescription;
  }

  return (
    <AppLocaleProvider locale={locale} prefixEnabled={true}>
      <SearchResultsView
        query={query}
        response={response}
        errorMessage={errorMessage}
        locale={locale}
      />
    </AppLocaleProvider>
  );
}
