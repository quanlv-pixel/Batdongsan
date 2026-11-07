import { describe, it, expect } from 'vitest';
import {
  buildListingsSearchParams,
  formatAdministrativeLocation,
  formatArea,
  formatListingDate,
  formatListingReferenceCode,
  formatPricePerSqm,
  formatVndPrice,
} from '@/lib/formatters';

describe('Vietnamese Listing Formatters Unit Tests', () => {
  describe('formatVndPrice', () => {
    it('1. Formats billion VND values accurately in Vietnamese notation', () => {
      expect(formatVndPrice('3200000000')).toBe('3,2 tỷ');
      expect(formatVndPrice('7800000000')).toBe('7,8 tỷ');
      expect(formatVndPrice('22500000000')).toBe('22,5 tỷ');
      expect(formatVndPrice('3650000000')).toBe('3,65 tỷ');
      expect(formatVndPrice('5000000000')).toBe('5 tỷ');
    });

    it('2. Formats million VND values and appends rentalPeriod for FOR_RENT', () => {
      expect(formatVndPrice('850000000')).toBe('850 triệu');
      expect(formatVndPrice('6500000')).toBe('6,5 triệu');
      expect(
        formatVndPrice('12000000', {
          transactionType: 'FOR_RENT',
          rentalPeriod: 'MONTH',
        }),
      ).toBe('12 triệu/tháng');
      expect(
        formatVndPrice('135000000', {
          transactionType: 'FOR_RENT',
          rentalPeriod: 'QUARTER',
        }),
      ).toBe('135 triệu/quý');
      expect(
        formatVndPrice('840000000', {
          transactionType: 'FOR_RENT',
          rentalPeriod: 'YEAR',
        }),
      ).toBe('840 triệu/năm');
    });

    it('3. Handles zero, negative, empty, or malformed price values safely', () => {
      expect(formatVndPrice('0')).toBe('Liên hệ');
      expect(formatVndPrice(0)).toBe('Liên hệ');
      expect(formatVndPrice('-500000000')).toBe('Liên hệ');
      expect(formatVndPrice('')).toBe('Liên hệ');
      expect(formatVndPrice('not-a-number')).toBe('Liên hệ');
      expect(formatVndPrice(null)).toBe('Liên hệ');
      expect(formatVndPrice(undefined)).toBe('Liên hệ');
    });

    it('4. Preserves precision for huge BigInt numeric strings beyond Number.MAX_SAFE_INTEGER', () => {
      // 9,007,199,254,740,993,000 VND (> Number.MAX_SAFE_INTEGER)
      expect(formatVndPrice('9007199254740993000')).toBe('9007199254,74 tỷ');
      expect(formatVndPrice('123456789012345000000')).toBe('123456789012,35 tỷ');
    });
  });

  describe('formatArea', () => {
    it('5. Formats positive area values in square meters with Vietnamese comma decimals', () => {
      expect(formatArea(78)).toBe('78 m²');
      expect(formatArea(78.5)).toBe('78,5 m²');
      expect(formatArea(120.25)).toBe('120,25 m²');
    });

    it('6. Returns empty string for zero, negative, NaN, Infinity, or missing area', () => {
      expect(formatArea(0)).toBe('');
      expect(formatArea(-45)).toBe('');
      expect(formatArea(Number.NaN)).toBe('');
      expect(formatArea(Number.POSITIVE_INFINITY)).toBe('');
      expect(formatArea(null)).toBe('');
      expect(formatArea(undefined)).toBe('');
    });
  });

  describe('formatListingDate', () => {
    it('7. Formats valid ISO dates as dd/MM/yyyy and rejects invalid/missing dates', () => {
      expect(formatListingDate('2026-11-01T10:00:00.000Z')).toBe('01/11/2026');
      expect(formatListingDate('')).toBe('');
      expect(formatListingDate('invalid-date-string')).toBe('');
      expect(formatListingDate(null)).toBe('');
      expect(formatListingDate(undefined)).toBe('');
    });
  });

  describe('formatPricePerSqm', () => {
    it('8. Calculates approximate price per sqm for FOR_SALE and handles edge cases safely', () => {
      // 3.2 billion / 78 sqm = ~41.025 million/sqm -> "~ 41 tr/m²"
      expect(formatPricePerSqm('3200000000', 78, 'FOR_SALE')).toBe('~ 41 tr/m²');
      // 7.8 billion / 78.5 sqm = ~99.36 million/sqm -> "~ 99 tr/m²"
      expect(formatPricePerSqm('7800000000', 78.5, 'FOR_SALE')).toBe(
        '~ 99 tr/m²',
      );

      // Edge cases: zero area, negative area, NaN, Infinity, FOR_RENT, invalid price
      expect(formatPricePerSqm('3200000000', 0, 'FOR_SALE')).toBeNull();
      expect(formatPricePerSqm('3200000000', -10, 'FOR_SALE')).toBeNull();
      expect(formatPricePerSqm('3200000000', Number.NaN, 'FOR_SALE')).toBeNull();
      expect(
        formatPricePerSqm('3200000000', Number.POSITIVE_INFINITY, 'FOR_SALE'),
      ).toBeNull();
      expect(formatPricePerSqm('12000000', 42, 'FOR_RENT')).toBeNull();
      expect(formatPricePerSqm('0', 78, 'FOR_SALE')).toBeNull();
    });
  });

  describe('formatAdministrativeLocation & buildListingsSearchParams', () => {
    it('9. Formats administrative location and serializes non-blank query parameters only', () => {
      expect(
        formatAdministrativeLocation({
          ward: 'Phường Bến Nghé',
          district: 'Quận 1',
          province: 'TP. Hồ Chí Minh',
        }),
      ).toBe('Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');

      expect(
        formatAdministrativeLocation({
          ward: null,
          district: 'Quận Tây Hồ',
          province: 'Hà Nội',
        }),
      ).toBe('Quận Tây Hồ, Hà Nội');

      const params = buildListingsSearchParams({
        transactionType: 'FOR_SALE',
        province: '  TP. Hồ Chí Minh ',
        district: '   ',
        propertyType: 'APARTMENT',
        minPrice: '2000000000',
        maxPrice: '',
        minArea: 50,
      });

      expect(params.get('transactionType')).toBe('FOR_SALE');
      expect(params.get('province')).toBe('TP. Hồ Chí Minh');
      expect(params.has('district')).toBe(false);
      expect(params.get('propertyType')).toBe('APARTMENT');
      expect(params.get('minPrice')).toBe('2000000000');
      expect(params.has('maxPrice')).toBe(false);
      expect(params.get('minArea')).toBe('50');
    });
  });

  describe('formatListingReferenceCode', () => {
    it('generates unique deterministic reference codes with BDS- prefix', () => {
      expect(formatListingReferenceCode('seed_listing_01')).toBe('BDS-SEED01');
      expect(formatListingReferenceCode('seed_listing_02')).toBe('BDS-SEED02');
      expect(formatListingReferenceCode('seed_listing_10')).toBe('BDS-SEED10');
      expect(formatListingReferenceCode('prop_123')).toBe('BDS-PROP123');
      expect(formatListingReferenceCode('a79d19ef-ca5d-4992-83ae-8203dc185963')).toBe('BDS-A79D5963');
      expect(formatListingReferenceCode('listing_test_01')).toBe('BDS-LISTST01');
      expect(formatListingReferenceCode('')).toBe('BDS-000000');
    });
  });
});
