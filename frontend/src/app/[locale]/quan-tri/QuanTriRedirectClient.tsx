'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function QuanTriRedirectClient({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const targetUrl = `/${locale}/admin${qs ? `?${qs}` : ''}`;
    router.replace(targetUrl);
  }, [router, searchParams, locale]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
