'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

function WorkspaceRedirect() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'vi';

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/${locale}/quan-ly${qs ? `?${qs}` : ''}`);
  }, [router, locale, searchParams]);

  return null;
}

export default function WorkspaceAliasPage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceRedirect />
    </Suspense>
  );
}
