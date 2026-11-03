import {
  PropertyType,
  PublicListingsQuery,
  RentalPeriod,
  TransactionType,
} from '@/types';

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

const RENTAL_PERIOD_LABELS: Record<RentalPeriod, string> = {
  MONTH: '/tháng',
  QUARTER: '/quý',
  YEAR: '/năm',
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Căn hộ chung cư',
  HOUSE: 'Nhà ở',
  VILLA: 'Biệt thự',
  LAND: 'Đất nền',
  COMMERCIAL: 'Thương mại / Văn phòng',
  OTHER: 'Bất động sản khác',
};

const SALE_BADGE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Bán căn hộ',
  HOUSE: 'Bán nhà ở',
  VILLA: 'Bán biệt thự',
  LAND: 'Bán đất nền',
  COMMERCIAL: 'Bán mặt bằng / VP',
  OTHER: 'Mua bán BĐS',
};

const RENT_BADGE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Thuê căn hộ',
  HOUSE: 'Thuê nhà ở',
  VILLA: 'Thuê biệt thự',
  LAND: 'Thuê đất',
  COMMERCIAL: 'Thuê mặt bằng / VP',
  OTHER: 'Cho thuê BĐS',
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
 * Formats a two-digit BigInt fraction (0..99) using Vietnamese comma separator,
 * stripping unnecessary trailing zeros (e.g. 20 -> ",2", 65 -> ",65", 0 -> "").
 */
function formatHundredthsSuffix(hundredths: bigint): string {
  if (hundredths <= ZERO) {
    return '';
  }
  if (hundredths % TEN === ZERO) {
    return `,${(hundredths / TEN).toString()}`;
  }
  return `,${hundredths.toString().padStart(2, '0')}`;
}

/**
 * Formats a Backend VND price value into Vietnamese currency notation
 * (e.g., "3200000000" -> "3,2 tỷ", "850000000" -> "850 triệu").
 * Appends rental period suffix only when transactionType is FOR_RENT.
 */
export function formatVndPrice(
  priceVnd: string | bigint | number | null | undefined,
  options?: {
    transactionType?: TransactionType;
    rentalPeriod?: RentalPeriod | null;
  },
): string {
  const amount = parsePositiveBigInt(priceVnd);
  if (amount === null) {
    return 'Liên hệ';
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
    formattedCore = `${whole.toString()}${formatHundredthsSuffix(hundredths)} tỷ`;
  } else if (amount >= MILLION) {
    let whole = amount / MILLION;
    const rem = amount % MILLION;
    let hundredths = (rem * HUNDRED + MILLION / TWO) / MILLION;
    if (hundredths >= HUNDRED) {
      whole += ONE;
      hundredths = ZERO;
    }
    if (whole >= THOUSAND) {
      formattedCore = '1 tỷ';
    } else {
      formattedCore = `${whole.toString()}${formatHundredthsSuffix(hundredths)} triệu`;
    }
  } else if (amount >= THOUSAND) {
    const wholeThousands = (amount + THOUSAND / TWO) / THOUSAND;
    formattedCore = `${wholeThousands.toString()} nghìn`;
  } else {
    formattedCore = `${amount.toString()} đồng`;
  }

  if (
    options?.transactionType === 'FOR_RENT' &&
    options.rentalPeriod &&
    RENTAL_PERIOD_LABELS[options.rentalPeriod]
  ) {
    return `${formattedCore}${RENTAL_PERIOD_LABELS[options.rentalPeriod]}`;
  }

  return formattedCore;
}

/**
 * Formats area in square meters using Vietnamese locale conventions.
 * Returns empty string for invalid or non-positive numbers.
 */
export function formatArea(areaSqm: number | null | undefined): string {
  if (
    typeof areaSqm !== 'number' ||
    !Number.isFinite(areaSqm) ||
    areaSqm <= 0
  ) {
    return '';
  }

  const rounded = Math.round(areaSqm * 100) / 100;
  const formattedNumber = rounded.toString().replace('.', ',');
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

  if (perSqmVnd >= BILLION) {
    let whole = perSqmVnd / BILLION;
    const rem = perSqmVnd % BILLION;
    let tenths = (rem * TEN + BILLION / TWO) / BILLION;
    if (tenths >= TEN) {
      whole += ONE;
      tenths = ZERO;
    }
    const suffix = tenths > ZERO ? `,${tenths.toString()}` : '';
    return `~ ${whole.toString()}${suffix} tỷ/m²`;
  }

  if (perSqmVnd >= MILLION) {
    const roundedMillions = (perSqmVnd + MILLION / TWO) / MILLION;
    if (roundedMillions >= TEN) {
      return `~ ${roundedMillions.toString()} tr/m²`;
    }
    let whole = perSqmVnd / MILLION;
    const rem = perSqmVnd % MILLION;
    let tenths = (rem * TEN + MILLION / TWO) / MILLION;
    if (tenths >= TEN) {
      whole += ONE;
      tenths = ZERO;
    }
    const suffix = tenths > ZERO ? `,${tenths.toString()}` : '';
    return `~ ${whole.toString()}${suffix} tr/m²`;
  }

  if (perSqmVnd >= THOUSAND) {
    const thousands = (perSqmVnd + THOUSAND / TWO) / THOUSAND;
    return `~ ${thousands.toString()} nghìn/m²`;
  }

  return null;
}

/**
 * Formats an ISO date string or Date into dd/MM/yyyy using Vietnamese conventions.
 * Returns empty string for missing or invalid dates.
 */
export function formatListingDate(
  dateInput: string | Date | null | undefined,
): string {
  if (!dateInput) {
    return '';
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
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

export function getPropertyTypeLabel(propertyType: PropertyType): string {
  return PROPERTY_TYPE_LABELS[propertyType] ?? 'Bất động sản';
}

export function getTransactionBadgeLabel(
  transactionType: TransactionType,
  propertyType: PropertyType,
): string {
  if (transactionType === 'FOR_RENT') {
    return RENT_BADGE_LABELS[propertyType] ?? 'Cho thuê BĐS';
  }
  return SALE_BADGE_LABELS[propertyType] ?? 'Mua bán BĐS';
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
