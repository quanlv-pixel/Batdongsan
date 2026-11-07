import {
  PropertyType,
  PublicListingsQuery,
  RentalPeriod,
  TransactionType,
} from '@/types';
import { AppLocale, DEFAULT_LOCALE } from '@/i18n/routing';

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const HUNDRED = BigInt(100);
const THOUSAND = BigInt(1000);
const MILLION = BigInt(1000000);
const BILLION = BigInt(1000000000);

const VALID_PROPERTY_TYPES: ReadonlySet<PropertyType> = new Set([
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'LAND',
  'COMMERCIAL',
  'OTHER',
]);

const VALID_TRANSACTION_TYPES: ReadonlySet<TransactionType> = new Set([
  'FOR_SALE',
  'FOR_RENT',
]);

const RENTAL_PERIOD_LABELS: Record<AppLocale, Record<RentalPeriod, string>> = {
  vi: {
    MONTH: '/tháng',
    QUARTER: '/quý',
    YEAR: '/năm',
  },
  en: {
    MONTH: '/month',
    QUARTER: '/quarter',
    YEAR: '/year',
  },
};

const PROPERTY_TYPE_LABELS: Record<AppLocale, Record<PropertyType, string>> = {
  vi: {
    APARTMENT: 'Căn hộ chung cư',
    HOUSE: 'Nhà ở',
    VILLA: 'Biệt thự',
    LAND: 'Đất nền',
    COMMERCIAL: 'Thương mại / Văn phòng',
    OTHER: 'Bất động sản khác',
  },
  en: {
    APARTMENT: 'Apartment',
    HOUSE: 'House',
    VILLA: 'Villa',
    LAND: 'Land',
    COMMERCIAL: 'Commercial / Office',
    OTHER: 'Other Property',
  },
};

const SALE_BADGE_LABELS: Record<AppLocale, Record<PropertyType, string>> = {
  vi: {
    APARTMENT: 'Bán căn hộ',
    HOUSE: 'Bán nhà ở',
    VILLA: 'Bán biệt thự',
    LAND: 'Bán đất nền',
    COMMERCIAL: 'Bán mặt bằng / VP',
    OTHER: 'Mua bán BĐS',
  },
  en: {
    APARTMENT: 'Apartment for Sale',
    HOUSE: 'House for Sale',
    VILLA: 'Villa for Sale',
    LAND: 'Land for Sale',
    COMMERCIAL: 'Commercial for Sale',
    OTHER: 'Property for Sale',
  },
};

const RENT_BADGE_LABELS: Record<AppLocale, Record<PropertyType, string>> = {
  vi: {
    APARTMENT: 'Thuê căn hộ',
    HOUSE: 'Thuê nhà ở',
    VILLA: 'Thuê biệt thự',
    LAND: 'Thuê đất',
    COMMERCIAL: 'Thuê mặt bằng / VP',
    OTHER: 'Cho thuê BĐS',
  },
  en: {
    APARTMENT: 'Apartment for Rent',
    HOUSE: 'House for Rent',
    VILLA: 'Villa for Rent',
    LAND: 'Land for Rent',
    COMMERCIAL: 'Commercial for Rent',
    OTHER: 'Property for Rent',
  },
};

/**
 * Safely parses a Backend BigInt string (or bigint/integer) into a positive BigInt
 * without precision loss from converting large values to JavaScript Number.
 */
export function parsePositiveBigInt(
  value: string | bigint | number | null | undefined,
): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    return value > ZERO ? value : null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      return null;
    }
    return BigInt(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      return null;
    }
    try {
      const parsed = BigInt(trimmed);
      return parsed > ZERO ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Formats a two-digit BigInt fraction (0..99) using locale decimal separator,
 * stripping unnecessary trailing zeros (e.g. 20 -> ",2" or ".2", 65 -> ",65" or ".65", 0 -> "").
 */
function formatHundredthsSuffix(
  hundredths: bigint,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  if (hundredths <= ZERO) {
    return '';
  }
  const sep = locale === 'en' ? '.' : ',';
  if (hundredths % TEN === ZERO) {
    return `${sep}${(hundredths / TEN).toString()}`;
  }
  return `${sep}${hundredths.toString().padStart(2, '0')}`;
}

/**
 * Formats a Backend VND price value into localized VND currency notation
 * (vi: "3,2 tỷ", "850 triệu"; en: "3.2B VND", "850M VND").
 * Appends rental period suffix only when transactionType is FOR_RENT.
 */
export function formatVndPrice(
  priceVnd: string | bigint | number | null | undefined,
  options?: {
    transactionType?: TransactionType;
    rentalPeriod?: RentalPeriod | null;
    locale?: AppLocale;
  },
): string {
  const locale: AppLocale = options?.locale === 'en' ? 'en' : 'vi';
  const amount = parsePositiveBigInt(priceVnd);
  if (amount === null) {
    return locale === 'en' ? 'Contact for price' : 'Liên hệ';
  }

  let formattedCore: string;

  if (amount >= BILLION) {
    let whole = amount / BILLION;
    const rem = amount % BILLION;
    let hundredths = (rem * HUNDRED + BILLION / TWO) / BILLION;
    if (hundredths >= HUNDRED) {
      whole += ONE;
      hundredths = ZERO;
    }
    const suffix = formatHundredthsSuffix(hundredths, locale);
    formattedCore =
      locale === 'en'
        ? `${whole.toString()}${suffix}B VND`
        : `${whole.toString()}${suffix} tỷ`;
  } else if (amount >= MILLION) {
    let whole = amount / MILLION;
    const rem = amount % MILLION;
    let hundredths = (rem * HUNDRED + MILLION / TWO) / MILLION;
    if (hundredths >= HUNDRED) {
      whole += ONE;
      hundredths = ZERO;
    }
    if (whole >= THOUSAND) {
      formattedCore = locale === 'en' ? '1B VND' : '1 tỷ';
    } else {
      const suffix = formatHundredthsSuffix(hundredths, locale);
      formattedCore =
        locale === 'en'
          ? `${whole.toString()}${suffix}M VND`
          : `${whole.toString()}${suffix} triệu`;
    }
  } else if (amount >= THOUSAND) {
    const wholeThousands = (amount + THOUSAND / TWO) / THOUSAND;
    formattedCore =
      locale === 'en'
        ? `${wholeThousands.toString()}K VND`
        : `${wholeThousands.toString()} nghìn`;
  } else {
    formattedCore =
      locale === 'en'
        ? `${amount.toString()} VND`
        : `${amount.toString()} đồng`;
  }

  const periodLabels = RENTAL_PERIOD_LABELS[locale];
  if (
    options?.transactionType === 'FOR_RENT' &&
    options.rentalPeriod &&
    periodLabels[options.rentalPeriod]
  ) {
    return `${formattedCore}${periodLabels[options.rentalPeriod]}`;
  }

  return formattedCore;
}

/**
 * Formats area in square meters using locale decimal conventions.
 * Returns empty string for invalid or non-positive numbers.
 */
export function formatArea(
  areaSqm: number | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  if (
    typeof areaSqm !== 'number' ||
    !Number.isFinite(areaSqm) ||
    areaSqm <= 0
  ) {
    return '';
  }

  const rounded = Math.round(areaSqm * 100) / 100;
  const formattedNumber =
    locale === 'en' ? rounded.toString() : rounded.toString().replace('.', ',');
  return `${formattedNumber} m²`;
}

/**
 * Calculates and formats approximate price per square meter for FOR_SALE listings.
 * Returns null if transactionType is FOR_RENT, areaSqm <= 0, or price is invalid.
 */
export function formatPricePerSqm(
  priceVnd: string | bigint | number | null | undefined,
  areaSqm: number | null | undefined,
  transactionType: TransactionType = 'FOR_SALE',
  locale: AppLocale = DEFAULT_LOCALE,
): string | null {
  if (transactionType === 'FOR_RENT') {
    return null;
  }

  if (
    typeof areaSqm !== 'number' ||
    !Number.isFinite(areaSqm) ||
    areaSqm <= 0
  ) {
    return null;
  }

  const amount = parsePositiveBigInt(priceVnd);
  if (amount === null) {
    return null;
  }

  const areaScaled = BigInt(Math.round(areaSqm * 100));
  if (areaScaled <= ZERO) {
    return null;
  }

  const perSqmVnd = (amount * HUNDRED + areaScaled / TWO) / areaScaled;
  if (perSqmVnd <= ZERO) {
    return null;
  }

  const sep = locale === 'en' ? '.' : ',';

  if (perSqmVnd >= BILLION) {
    let whole = perSqmVnd / BILLION;
    const rem = perSqmVnd % BILLION;
    let tenths = (rem * TEN + BILLION / TWO) / BILLION;
    if (tenths >= TEN) {
      whole += ONE;
      tenths = ZERO;
    }
    const suffix = tenths > ZERO ? `${sep}${tenths.toString()}` : '';
    return locale === 'en'
      ? `~ ${whole.toString()}${suffix}B VND/m²`
      : `~ ${whole.toString()}${suffix} tỷ/m²`;
  }

  if (perSqmVnd >= MILLION) {
    const roundedMillions = (perSqmVnd + MILLION / TWO) / MILLION;
    if (roundedMillions >= TEN) {
      return locale === 'en'
        ? `~ ${roundedMillions.toString()}M VND/m²`
        : `~ ${roundedMillions.toString()} tr/m²`;
    }
    let whole = perSqmVnd / MILLION;
    const rem = perSqmVnd % MILLION;
    let tenths = (rem * TEN + MILLION / TWO) / MILLION;
    if (tenths >= TEN) {
      whole += ONE;
      tenths = ZERO;
    }
    const suffix = tenths > ZERO ? `${sep}${tenths.toString()}` : '';
    return locale === 'en'
      ? `~ ${whole.toString()}${suffix}M VND/m²`
      : `~ ${whole.toString()}${suffix} tr/m²`;
  }

  if (perSqmVnd >= THOUSAND) {
    const thousands = (perSqmVnd + THOUSAND / TWO) / THOUSAND;
    return locale === 'en'
      ? `~ ${thousands.toString()}K VND/m²`
      : `~ ${thousands.toString()} nghìn/m²`;
  }

  return null;
}

/**
 * Formats an ISO date string or Date using locale conventions.
 * Returns empty string for missing or invalid dates.
 */
export function formatListingDate(
  dateInput: string | Date | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  if (!dateInput) {
    return '';
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  if (locale === 'en') {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Joins administrative location fields (ward, district, province) cleanly.
 */
export function formatAdministrativeLocation(location: {
  ward?: string | null;
  district?: string | null;
  province?: string | null;
}): string {
  const parts = [location.ward, location.district, location.province]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);

  return parts.join(', ');
}

export function getPropertyTypeLabel(
  propertyType: PropertyType,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  const map = PROPERTY_TYPE_LABELS[locale === 'en' ? 'en' : 'vi'];
  return (
    map[propertyType] ?? (locale === 'en' ? 'Property' : 'Bất động sản')
  );
}

export function getTransactionBadgeLabel(
  transactionType: TransactionType,
  propertyType: PropertyType,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  const safeLocale: AppLocale = locale === 'en' ? 'en' : 'vi';
  if (transactionType === 'FOR_RENT') {
    return (
      RENT_BADGE_LABELS[safeLocale][propertyType] ??
      (safeLocale === 'en' ? 'Property for Rent' : 'Cho thuê BĐS')
    );
  }
  return (
    SALE_BADGE_LABELS[safeLocale][propertyType] ??
    (safeLocale === 'en' ? 'Property for Sale' : 'Mua bán BĐS')
  );
}

/**
 * Serializes supported query parameters for /bat-dong-san and GET /api/listings.
 * Strictly omits blank or unsupported values.
 */
export function buildListingsSearchParams(
  query: PublicListingsQuery,
): URLSearchParams {
  const params = new URLSearchParams();

  if (
    query.transactionType &&
    VALID_TRANSACTION_TYPES.has(query.transactionType)
  ) {
    params.set('transactionType', query.transactionType);
  }

  if (typeof query.province === 'string' && query.province.trim().length > 0) {
    params.set('province', query.province.trim());
  }

  if (typeof query.district === 'string' && query.district.trim().length > 0) {
    params.set('district', query.district.trim());
  }

  if (typeof query.ward === 'string' && query.ward.trim().length > 0) {
    params.set('ward', query.ward.trim());
  }

  if (query.propertyType && VALID_PROPERTY_TYPES.has(query.propertyType)) {
    params.set('propertyType', query.propertyType);
  }

  if (
    typeof query.minPrice === 'string' &&
    /^[1-9]\d*$/.test(query.minPrice.trim())
  ) {
    params.set('minPrice', query.minPrice.trim());
  }

  if (
    typeof query.maxPrice === 'string' &&
    /^[1-9]\d*$/.test(query.maxPrice.trim())
  ) {
    params.set('maxPrice', query.maxPrice.trim());
  }

  if (
    typeof query.minArea === 'number' &&
    Number.isFinite(query.minArea) &&
    query.minArea >= 0
  ) {
    params.set('minArea', query.minArea.toString());
  }

  if (
    typeof query.maxArea === 'number' &&
    Number.isFinite(query.maxArea) &&
    query.maxArea >= 0
  ) {
    params.set('maxArea', query.maxArea.toString());
  }

  if (
    typeof query.page === 'number' &&
    Number.isInteger(query.page) &&
    query.page >= 1
  ) {
    params.set('page', query.page.toString());
  }

  if (
    typeof query.limit === 'number' &&
    Number.isInteger(query.limit) &&
    query.limit >= 1 &&
    query.limit <= 100
  ) {
    params.set('limit', query.limit.toString());
  }

  return params;
}

/**
 * Safely parses and normalizes URL search parameters (URLSearchParams or raw query object)
 * into a typed PublicListingsQuery according to Backend QueryListingsDto validation rules.
 *
 * - Non-empty strings are trimmed.
 * - Enums (transactionType, propertyType) are strictly validated against allowlists.
 * - minPrice / maxPrice must match /^[1-9]\d*$/.
 * - minArea / maxArea must be finite non-negative numbers.
 * - page must be an integer >= 1.
 * - limit must be an integer between 1 and 100.
 */
export function parseListingsSearchParams(
  rawParams:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | undefined,
): PublicListingsQuery {
  const getParam = (key: string): string | undefined => {
    if (!rawParams) return undefined;
    if (typeof (rawParams as URLSearchParams).get === 'function') {
      const val = (rawParams as URLSearchParams).get(key);
      return val !== null ? val : undefined;
    }
    const val = (rawParams as Record<string, string | string[] | undefined>)[
      key
    ];
    if (Array.isArray(val)) {
      return val[0];
    }
    return val;
  };

  const query: PublicListingsQuery = {};

  const txType = getParam('transactionType')?.trim();
  if (txType && VALID_TRANSACTION_TYPES.has(txType as TransactionType)) {
    query.transactionType = txType as TransactionType;
  }

  const propType = getParam('propertyType')?.trim();
  if (propType && VALID_PROPERTY_TYPES.has(propType as PropertyType)) {
    query.propertyType = propType as PropertyType;
  }

  const province = getParam('province')?.trim();
  if (province) {
    query.province = province;
  }

  const district = getParam('district')?.trim();
  if (district) {
    query.district = district;
  }

  const ward = getParam('ward')?.trim();
  if (ward) {
    query.ward = ward;
  }

  const rawMinPrice = getParam('minPrice')?.trim();
  if (rawMinPrice && /^[1-9]\d*$/.test(rawMinPrice)) {
    query.minPrice = rawMinPrice;
  }

  const rawMaxPrice = getParam('maxPrice')?.trim();
  if (rawMaxPrice && /^[1-9]\d*$/.test(rawMaxPrice)) {
    query.maxPrice = rawMaxPrice;
  }

  const rawMinArea = getParam('minArea')?.trim();
  if (rawMinArea && !Number.isNaN(Number(rawMinArea))) {
    const num = Number(rawMinArea);
    if (Number.isFinite(num) && num >= 0) {
      query.minArea = num;
    }
  }

  const rawMaxArea = getParam('maxArea')?.trim();
  if (rawMaxArea && !Number.isNaN(Number(rawMaxArea))) {
    const num = Number(rawMaxArea);
    if (Number.isFinite(num) && num >= 0) {
      query.maxArea = num;
    }
  }

  const rawPage = getParam('page')?.trim();
  if (rawPage && /^\d+$/.test(rawPage)) {
    const pageNum = parseInt(rawPage, 10);
    if (pageNum >= 1) {
      query.page = pageNum;
    }
  }

  const rawLimit = getParam('limit')?.trim();
  if (rawLimit && /^\d+$/.test(rawLimit)) {
    const limitNum = parseInt(rawLimit, 10);
    if (limitNum >= 1 && limitNum <= 100) {
      query.limit = limitNum;
    }
  }

  return query;
}

export interface FilterValidationErrors {
  priceError?: string;
  areaError?: string;
}

/**
 * Validates that minimum values do not exceed maximum values for price and area ranges.
 */
export function validateFilterRanges(
  query: Pick<
    PublicListingsQuery,
    'minPrice' | 'maxPrice' | 'minArea' | 'maxArea'
  >,
  dict?: {
    priceMinExceedsMax?: string;
    areaMinExceedsMax?: string;
  },
): FilterValidationErrors {
  const errors: FilterValidationErrors = {};

  if (query.minPrice && query.maxPrice) {
    try {
      if (BigInt(query.minPrice) > BigInt(query.maxPrice)) {
        errors.priceError =
          dict?.priceMinExceedsMax ||
          'Mức giá tối thiểu không thể lớn hơn mức giá tối đa';
      }
    } catch {
      // ignore
    }
  }

  if (
    typeof query.minArea === 'number' &&
    typeof query.maxArea === 'number' &&
    query.minArea > query.maxArea
  ) {
    errors.areaError =
      dict?.areaMinExceedsMax ||
      'Diện tích tối thiểu không thể lớn hơn diện tích tối đa';
  }

  return errors;
}


/**
 * Generates a deterministic, unique user-facing reference code for a listing.
 * Prefix is always BDS-.
 */
export function formatListingReferenceCode(id: string): string {
  if (!id || typeof id !== 'string') return 'BDS-000000';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.startsWith('SEEDLISTING')) {
    return `BDS-SEED${clean.replace('SEEDLISTING', '')}`;
  }
  if (clean.length <= 8) {
    return `BDS-${clean}`;
  }
  return `BDS-${clean.slice(0, 4)}${clean.slice(-4)}`;
}
