'use client';

import React from 'react';
import Link from 'next/link';
import { PublicListingsQuery } from '@/types';
import { buildListingsSearchParams } from '@/lib/formatters';
import { useDictionary, useLocalizedHref } from '@/i18n';

interface SearchPaginationProps {
  page: number;
  totalPages: number;
  currentQuery: PublicListingsQuery;
}

export function SearchPagination({
  page,
  totalPages,
  currentQuery,
}: SearchPaginationProps) {
  const dict = useDictionary();
  const localizeHref = useLocalizedHref();

  if (totalPages <= 1) {
    return null;
  }

  const getPageHref = (targetPage: number) => {
    const nextQuery: PublicListingsQuery = {
      ...currentQuery,
      page: targetPage,
    };
    const params = buildListingsSearchParams(nextQuery);
    const queryString = params.toString();
    return localizeHref(
      `/bat-dong-san${queryString ? `?${queryString}` : ''}`,
    );
  };

  // Generate page numbers array (simple bounded pagination)
  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      data-testid="search-pagination"
      aria-label={dict.SearchResults.pagination.ariaLabel}
      className="mt-8 flex items-center justify-center gap-1.5 flex-wrap"
    >
      {/* Previous Page Button */}
      {hasPrev ? (
        <Link
          href={getPageHref(page - 1)}
          data-testid="pagination-prev"
          className="border border-[#CBD5E1] text-[#475569] hover:border-[#0F766E] hover:text-[#0F766E] px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-sm leading-none">
            arrow_back
          </span>
          <span>{dict.SearchResults.pagination.previous}</span>
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-testid="pagination-prev-disabled"
          className="border border-[#E2E8F0] text-[#94A3B8] px-3.5 py-1.5 rounded-lg text-xs cursor-not-allowed flex items-center gap-1 bg-[#F8FAFC]"
        >
          <span className="material-symbols-outlined text-sm leading-none">
            arrow_back
          </span>
          <span>{dict.SearchResults.pagination.previous}</span>
        </button>
      )}

      {/* Leading Page 1 + ellipsis if far */}
      {startPage > 1 && (
        <>
          <Link
            href={getPageHref(1)}
            className="border border-[#CBD5E1] text-[#475569] hover:border-[#0F766E] hover:text-[#0F766E] px-3 py-1.5 rounded-lg text-xs font-medium bg-white transition-colors"
          >
            1
          </Link>
          {startPage > 2 && (
            <span className="px-1 text-xs text-[#94A3B8]">...</span>
          )}
        </>
      )}

      {/* Bounded Page Numbers */}
      {pages.map((p) => {
        const isCurrent = p === page;
        if (isCurrent) {
          return (
            <button
              key={p}
              type="button"
              aria-current="page"
              data-testid={`pagination-page-${p}`}
              className="bg-[#0F766E] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs"
            >
              {p}
            </button>
          );
        }
        return (
          <Link
            key={p}
            href={getPageHref(p)}
            data-testid={`pagination-page-${p}`}
            className="border border-[#CBD5E1] text-[#475569] hover:border-[#0F766E] hover:text-[#0F766E] px-3 py-1.5 rounded-lg text-xs font-medium bg-white transition-colors"
          >
            {p}
          </Link>
        );
      })}

      {/* Trailing ellipsis + Last Page if far */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="px-1 text-xs text-[#94A3B8]">...</span>
          )}
          <Link
            href={getPageHref(totalPages)}
            className="border border-[#CBD5E1] text-[#475569] hover:border-[#0F766E] hover:text-[#0F766E] px-3 py-1.5 rounded-lg text-xs font-medium bg-white transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next Page Button */}
      {hasNext ? (
        <Link
          href={getPageHref(page + 1)}
          data-testid="pagination-next"
          className="border border-[#CBD5E1] text-[#475569] hover:border-[#0F766E] hover:text-[#0F766E] px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white flex items-center gap-1 transition-colors"
        >
          <span>{dict.SearchResults.pagination.next}</span>
          <span className="material-symbols-outlined text-sm leading-none">
            arrow_forward
          </span>
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-testid="pagination-next-disabled"
          className="border border-[#E2E8F0] text-[#94A3B8] px-3.5 py-1.5 rounded-lg text-xs cursor-not-allowed flex items-center gap-1 bg-[#F8FAFC]"
        >
          <span>{dict.SearchResults.pagination.next}</span>
          <span className="material-symbols-outlined text-sm leading-none">
            arrow_forward
          </span>
        </button>
      )}
    </nav>
  );
}
