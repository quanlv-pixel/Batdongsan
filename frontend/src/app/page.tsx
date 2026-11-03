import React, { Suspense } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { HeroSearchBox } from '@/components/home/HeroSearchBox';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { LatestListingsGrid } from '@/components/home/LatestListingsGrid';
import { TrustBenefits } from '@/components/home/TrustBenefits';
import { OwnerCtaBanner } from '@/components/home/OwnerCtaBanner';
import { fetchPublicListings } from '@/lib/public-listings';
import { PublicListingSummary } from '@/types';

/**
 * Server Component section that fetches fresh APPROVED public listings
 * from GET /api/listings?limit=6 and renders LatestListingsGrid.
 */
export async function LatestListingsSection() {
  let listings: PublicListingSummary[] = [];
  let errorMessage: string | null = null;

  try {
    const response = await fetchPublicListings({ limit: 6 });
    listings = response.data;
  } catch (err: unknown) {
    errorMessage =
      err instanceof Error && err.message
        ? err.message
        : 'Không thể tải danh sách bất động sản lúc này. Vui lòng thử lại sau.';
  }

  return <LatestListingsGrid listings={listings} error={errorMessage} />;
}

interface HomePageShellProps {
  listingsSlot?: React.ReactNode;
}

export function HomePageShell({ listingsSlot }: HomePageShellProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] text-[#142B4A]">
      <Navbar />
      <main className="flex-grow">
        <HeroSearchBox />
        <CategoryGrid />
        {listingsSlot ?? (
          <Suspense
            fallback={<LatestListingsGrid listings={[]} isLoading={true} />}
          >
            <LatestListingsSection />
          </Suspense>
        )}
        <TrustBenefits />
        <OwnerCtaBanner />
      </main>
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return <HomePageShell />;
}
