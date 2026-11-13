import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/assistant/chat/route';
import { extractPropertySearchIntent } from '@/lib/assistant-nlp';

function createRequest(body: unknown, rawBody?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody !== undefined ? rawBody : JSON.stringify(body),
  });
}

describe('extractPropertySearchIntent (VI & EN)', () => {
  it('parses Vietnamese sale apartment with maxPrice, minArea and province', () => {
    const filters = extractPropertySearchIntent(
      'Tìm căn hộ bán dưới 8 tỷ tại Hà Nội diện tích trên 70m2',
    );
    expect(filters).toEqual({
      transactionType: 'FOR_SALE',
      propertyType: 'APARTMENT',
      maxPrice: '8000000000',
      minArea: 70,
      province: 'Hà Nội',
    });
  });

  it('parses Vietnamese rent house with price range in triệu and TP.HCM', () => {
    const filters = extractPropertySearchIntent(
      'Tìm nhà riêng cho thuê từ 15 đến 25 triệu tại TP.HCM',
    );
    expect(filters).toEqual({
      transactionType: 'FOR_RENT',
      propertyType: 'HOUSE',
      minPrice: '15000000',
      maxPrice: '25000000',
      province: 'Hồ Chí Minh',
    });
  });

  it('parses English query with billion/sqm and district', () => {
    const filters = extractPropertySearchIntent(
      'Villa for sale under 12B in Ho Chi Minh District 2 over 150 sqm',
    );
    expect(filters).toEqual({
      transactionType: 'FOR_SALE',
      propertyType: 'VILLA',
      maxPrice: '12000000000',
      minArea: 150,
      province: 'Hồ Chí Minh',
      district: 'Quận 2',
    });
  });

  it('parses area range and land property type', () => {
    const filters = extractPropertySearchIntent(
      'Đất nền bán tại Đà Nẵng 80-120 m²',
    );
    expect(filters).toEqual({
      transactionType: 'FOR_SALE',
      propertyType: 'LAND',
      minArea: 80,
      maxArea: 120,
      province: 'Đà Nẵng',
    });
  });
});

describe('POST /api/assistant/chat BFF Route Handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 400 for malformed JSON', async () => {
    const req = createRequest(null, '{bad json');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-object JSON payload', async () => {
    const req = createRequest(['hello']);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty or whitespace message', async () => {
    const req = createRequest({ message: '   ', locale: 'vi' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-string message', async () => {
    const req = createRequest({ message: 12345, locale: 'vi' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for oversized message (> 500 chars)', async () => {
    const req = createRequest({ message: 'a'.repeat(501), locale: 'vi' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when history is not an array', async () => {
    const req = createRequest({ message: 'Tìm căn hộ', history: 'invalid' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('strips private PII/address fields and returns only APPROVED allowlist recommendations', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'listing-approved-1',
              title: 'Căn hộ cao cấp Cầu Giấy',
              description: 'Mô tả',
              propertyType: 'APARTMENT',
              transactionType: 'FOR_SALE',
              priceVnd: '6500000000',
              rentalPeriod: null,
              areaSqm: 85,
              province: 'Hà Nội',
              district: 'Cầu Giấy',
              ward: 'Dịch Vọng',
              status: 'APPROVED',
              streetAddress: '123 Bí Mật Street',
              latitude: 21.0285,
              longitude: 105.8542,
              ownerId: 'secret-owner-id',
              owner: { email: 'secret@example.test', phone: '0909999999' },
              createdAt: '2026-11-01T00:00:00Z',
              updatedAt: '2026-11-01T00:00:00Z',
              images: [{ id: 'img-1', url: '/img1.jpg', order: 0 }],
            },
            {
              id: 'listing-pending-2',
              title: 'Tin chưa duyệt',
              description: 'Hidden',
              propertyType: 'APARTMENT',
              transactionType: 'FOR_SALE',
              priceVnd: '5000000000',
              rentalPeriod: null,
              areaSqm: 70,
              province: 'Hà Nội',
              district: 'Đống Đa',
              ward: null,
              status: 'PENDING',
              createdAt: '2026-11-01T00:00:00Z',
              updatedAt: '2026-11-01T00:00:00Z',
              images: [],
            },
          ],
          meta: { total: 1, page: 1, limit: 4, totalPages: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const req = createRequest({
      message: 'Tìm căn hộ bán dưới 8 tỷ tại Hà Nội',
      locale: 'vi',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.isFallback).toBe(false);
    expect(json.recommendations).toHaveLength(1);

    const rec = json.recommendations[0];
    expect(rec).toEqual({
      id: 'listing-approved-1',
      title: 'Căn hộ cao cấp Cầu Giấy',
      priceVnd: '6500000000',
      rentalPeriod: null,
      areaSqm: 85,
      propertyType: 'APARTMENT',
      transactionType: 'FOR_SALE',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: 'Dịch Vọng',
      thumbnailUrl: '/img1.jpg',
    });

    // Ensure private fields are strictly absent
    expect(rec.streetAddress).toBeUndefined();
    expect(rec.latitude).toBeUndefined();
    expect(rec.longitude).toBeUndefined();
    expect(rec.ownerId).toBeUndefined();
    expect(rec.owner).toBeUndefined();
  });

  it('performs fallback query when strict filters return 0 results', async () => {
    // First call (strict) -> 0 results
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          meta: { total: 0, page: 1, limit: 4, totalPages: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    // Second call (relaxed) -> 1 result
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'listing-fallback-1',
              title: 'Biệt thự gần đó',
              description: 'Mô tả',
              propertyType: 'VILLA',
              transactionType: 'FOR_SALE',
              priceVnd: '18000000000',
              rentalPeriod: null,
              areaSqm: 220,
              province: 'Hà Nội',
              district: 'Tây Hồ',
              ward: null,
              status: 'APPROVED',
              createdAt: '2026-11-01T00:00:00Z',
              updatedAt: '2026-11-01T00:00:00Z',
              images: [],
            },
          ],
          meta: { total: 1, page: 1, limit: 4, totalPages: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const req = createRequest({
      message: 'Villas for sale under 1B in Hanoi',
      locale: 'en',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.isFallback).toBe(true);
    expect(json.recommendations).toHaveLength(1);
    expect(json.recommendations[0].id).toBe('listing-fallback-1');
    expect(json.reply).toContain('No exact approved listings matched');
  });

  it('masks unexpected upstream errors with generic 500 without leaking stack traces', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(
      new Error('ECONNREFUSED 127.0.0.1:3001 internal stack secret'),
    );

    const req = createRequest({
      message: 'Tìm nhà bán tại Hà Nội',
      locale: 'vi',
    });
    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe(
      'Unable to process property assistant request at this time.',
    );
    expect(JSON.stringify(json)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(json)).not.toContain('3001');
  });
});
