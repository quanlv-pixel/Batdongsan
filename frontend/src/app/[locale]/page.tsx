import React, { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { HeroSearchBox } from '@/components/home/HeroSearchBox';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { LatestListingsGrid } from '@/components/home/LatestListingsGrid';
import { TrustBenefits } from '@/components/home/TrustBenefits';
import { OwnerCtaBanner } from '@/components/home/OwnerCtaBanner';
import { fetchPublicListings } from '@/lib/public-listings';
import { PublicListingSummary } from '@/types';
import { AppLocaleProvider } from '@/i18n';
import { getDictionary } from '@/i18n/dictionaries';
import { AppLocale, DEFAULT_LOCALE, resolveLocale } from '@/i18n/routing';

/**
 * Server Component section that fetches fresh APPROVED public listings
 * from GET /api/listings?limit=6 and renders LatestListingsGrid.
 */
export async function LatestListingsSection({
  locale = DEFAULT_LOCALE,
}: {
  locale?: AppLocale;
} = {}) {
  const dict = getDictionary(locale);
  let listings: PublicListingSummary[] = [];
  let errorMessage: string | null = null;

  try {
    const response = await fetchPublicListings({ limit: 6 });
    listings = response.data;
  } catch (err: unknown) {
    errorMessage =
      err instanceof Error && err.message
        ? err.message
        : dict.LatestListings.defaultFetchError;
  }

  return <LatestListingsGrid listings={listings} error={errorMessage} />;
}

interface HomePageShellProps {
  listingsSlot?: React.ReactNode;
  locale?: AppLocale;
}

export function HomePageShell({ listingsSlot, locale }: HomePageShellProps) {
  const content = (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] text-[#142B4A]">
      <Navbar />
      <main className="flex-grow">
        <HeroSearchBox />
        <CategoryGrid />
        {listingsSlot ?? (
          <Suspense
            fallback={<LatestListingsGrid listings={[]} isLoading={true} />}
          >
            <LatestListingsSection locale={locale ?? DEFAULT_LOCALE} />
          </Suspense>
        )}
        <TrustBenefits />
        <OwnerCtaBanner />
      </main>
      <Footer />
    </div>
  );

  if (locale) {
    return (
      <AppLocaleProvider locale={locale} prefixEnabled={true}>
        {content}
      </AppLocaleProvider>
    );
  }

  return content;
}

export default async function HomePage({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const resolvedParams = params ? await params : { locale: DEFAULT_LOCALE };
  const locale = resolveLocale(resolvedParams.locale);
  setRequestLocale(locale);

  return (
    <HomePageShell
      listingsSlot={
        <Suspense
          fallback={<LatestListingsGrid listings={[]} isLoading={true} />}
        >
          <LatestListingsSection locale={locale} />
        </Suspense>
      }
    />
  );
}
