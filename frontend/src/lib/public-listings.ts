import { getBackendBaseUrl } from '@/lib/server-config';
import { ApiClientError } from '@/lib/api-client';
import { buildListingsSearchParams } from '@/lib/formatters';
import {
  ListingImage,
  PublicListingsQuery,
  PublicListingsResponse,
  PublicListingSummary,
} from '@/types';

/**
 * Sanitizes a raw listing object to strictly match the public allowlist contract.
 * Guarantees private fields (streetAddress, latitude, longitude, ownerId, owner)
 * are never retained even if present in an upstream payload.
 */
export function sanitizePublicListing(
  raw: PublicListingSummary,
): PublicListingSummary {
  const images: ListingImage[] = Array.isArray(raw.images)
    ? [...raw.images]
        .filter(
          (img): img is ListingImage =>
            Boolean(img) &&
            typeof img.id === 'string' &&
            typeof img.url === 'string' &&
            img.url.trim().length > 0,
        )
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((img) => ({
          id: img.id,
          url: img.url.trim(),
          order: typeof img.order === 'number' ? img.order : 0,
        }))
    : [];

  return {
    id: String(raw.id),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    propertyType: raw.propertyType,
    transactionType: raw.transactionType,
    priceVnd: String(raw.priceVnd ?? '0'),
    rentalPeriod: raw.rentalPeriod ?? null,
    areaSqm: Number(raw.areaSqm ?? 0),
    province: String(raw.province ?? ''),
    district: String(raw.district ?? ''),
    ward: raw.ward ? String(raw.ward) : null,
    status: raw.status,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    images,
  };
}

/**
 * Fetches public APPROVED listings from the NestJS backend (`GET /api/listings`).
 * Uses existing `getBackendBaseUrl()` configuration and `cache: 'no-store'`
 * so unapproved or newly moderated listings are never served stale.
 */
export async function fetchPublicListings(
  query: PublicListingsQuery = { limit: 6 },
): Promise<PublicListingsResponse> {
  const baseUrl = getBackendBaseUrl();
  const searchParams = buildListingsSearchParams(query);
  const queryString = searchParams.toString();
  const url = `${baseUrl}/api/listings${queryString ? `?${queryString}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Không thể kết nối đến máy chủ bất động sản.';
    throw new ApiClientError(500, message, 'Network Error');
  }

  if (!response.ok) {
    let errorMessage =
      'Không thể tải danh sách bất động sản lúc này. Vui lòng thử lại sau.';
    try {
      const errorBody = (await response.json()) as {
        message?: string | string[];
      };
      if (errorBody?.message) {
        errorMessage = Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : errorBody.message;
      }
    } catch {
      // keep default Vietnamese error message
    }
    throw new ApiClientError(response.status, errorMessage);
  }

  const payload = (await response.json()) as PublicListingsResponse;
  const rawItems = Array.isArray(payload?.data) ? payload.data : [];

  // Enforce APPROVED status and strict public field allowlist
  const data = rawItems
    .filter((item) => item && item.status === 'APPROVED')
    .map(sanitizePublicListing);

  return {
    data,
    meta: {
      total: typeof payload?.meta?.total === 'number' ? payload.meta.total : data.length,
      page: typeof payload?.meta?.page === 'number' ? payload.meta.page : 1,
      limit:
        typeof payload?.meta?.limit === 'number'
          ? payload.meta.limit
          : (query.limit ?? 6),
      totalPages:
        typeof payload?.meta?.totalPages === 'number'
          ? payload.meta.totalPages
          : data.length > 0
            ? 1
            : 0,
    },
  };
}
