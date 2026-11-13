import {
  AssistantExtractedFilters,
  AssistantListingRecommendation,
  PropertyType,
  PublicListingSummary,
  TransactionType,
} from '@/types';
import {
  formatAdministrativeLocation,
  formatArea,
  formatVndPrice,
  getPropertyTypeLabel,
} from '@/lib/formatters';

function removeDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function parseDecimalNumber(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unitToMultiplier(unitRaw: string | undefined): number {
  if (!unitRaw) return 1;
  const u = removeDiacritics(unitRaw.toLowerCase()).trim();
  if (u === 'ty' || u === 'ti' || u === 'b' || u === 'billion') {
    return 1_000_000_000;
  }
  if (u === 'trieu' || u === 'tr' || u === 'm' || u === 'million') {
    return 1_000_000;
  }
  return 1;
}

function toPositiveIntegerString(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const rounded = Math.round(value);
  if (rounded <= 0) return undefined;
  return String(rounded);
}

const PROVINCE_MATCHERS: Array<{ canonical: string; patterns: string[] }> = [
  {
    canonical: 'Hà Nội',
    patterns: ['ha noi', 'hanoi', 'hn'],
  },
  {
    canonical: 'Hồ Chí Minh',
    patterns: [
      'ho chi minh',
      'tp hcm',
      'tp.hcm',
      'tphcm',
      'hcmc',
      'sai gon',
      'saigon',
    ],
  },
  {
    canonical: 'Đà Nẵng',
    patterns: ['da nang', 'danang'],
  },
  {
    canonical: 'Hải Phòng',
    patterns: ['hai phong', 'haiphong'],
  },
  {
    canonical: 'Cần Thơ',
    patterns: ['can tho', 'cantho'],
  },
  {
    canonical: 'Bình Dương',
    patterns: ['binh duong', 'binhduong'],
  },
  {
    canonical: 'Đồng Nai',
    patterns: ['dong nai', 'dongnai'],
  },
  {
    canonical: 'Khánh Hòa',
    patterns: ['khanh hoa', 'nha trang'],
  },
  {
    canonical: 'Lâm Đồng',
    patterns: ['lam dong', 'da lat', 'dalat'],
  },
  {
    canonical: 'Bà Rịa - Vũng Tàu',
    patterns: ['ba ria', 'vung tau', 'vungtau'],
  },
  {
    canonical: 'Quảng Ninh',
    patterns: ['quang ninh', 'ha long', 'halong'],
  },
  {
    canonical: 'Thừa Thiên Huế',
    patterns: ['thua thien hue', 'hue'],
  },
];

const DISTRICT_MATCHERS: Array<{ canonical: string; patterns: string[] }> = [
  { canonical: 'Thủ Đức', patterns: ['thu duc', 'thao dien'] },
  { canonical: 'Bình Thạnh', patterns: ['binh thanh'] },
  { canonical: 'Gò Vấp', patterns: ['go vap'] },
  { canonical: 'Tân Bình', patterns: ['tan binh'] },
  { canonical: 'Phú Nhuận', patterns: ['phu nhuan'] },
  { canonical: 'Cầu Giấy', patterns: ['cau giay'] },
  { canonical: 'Ba Đình', patterns: ['ba dinh'] },
  { canonical: 'Đống Đa', patterns: ['dong da'] },
  { canonical: 'Hoàn Kiếm', patterns: ['hoan kiem'] },
  { canonical: 'Tây Hồ', patterns: ['tay ho'] },
  { canonical: 'Hai Bà Trưng', patterns: ['hai ba trung'] },
  { canonical: 'Thanh Xuân', patterns: ['thanh xuan'] },
  { canonical: 'Nam Từ Liêm', patterns: ['nam tu liem'] },
  { canonical: 'Hà Đông', patterns: ['ha dong'] },
  { canonical: 'Hải Châu', patterns: ['hai chau'] },
  { canonical: 'Sơn Trà', patterns: ['son tra'] },
  { canonical: 'Ngũ Hành Sơn', patterns: ['ngu hanh son'] },
];

function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return regex.test(haystack);
}

/**
 * Extracts structured property search filters from Vietnamese or English natural-language queries.
 */
export function extractPropertySearchIntent(
  rawMessage: string,
): AssistantExtractedFilters {
  const normalized = rawMessage.normalize('NFC').trim();
  const ascii = removeDiacritics(normalized.toLowerCase());
  const filters: AssistantExtractedFilters = {};

  // 1. Transaction Type (rent takes priority when "cho thue" / "thue" / "rent" appears without "mua"/"buy")
  const hasRent = /\b(cho thue|thue|rent|rental|lease|for rent)\b/i.test(ascii);
  const hasSale = /\b(mua|ban|can mua|tim mua|buy|sale|for sale|purchase)\b/i.test(
    ascii,
  );
  if (hasRent && !hasSale) {
    filters.transactionType = 'FOR_RENT' satisfies TransactionType;
  } else if (hasSale && !hasRent) {
    filters.transactionType = 'FOR_SALE' satisfies TransactionType;
  } else if (/\bcho thue\b|\bfor rent\b/i.test(ascii)) {
    filters.transactionType = 'FOR_RENT';
  } else if (/\bmua\b|\bfor sale\b/i.test(ascii)) {
    filters.transactionType = 'FOR_SALE';
  }

  // 2. Property Type (aligned with Prisma PropertyType enum)
  const propertyRules: Array<{ type: PropertyType; regex: RegExp }> = [
    {
      type: 'VILLA',
      regex: /\b(biet thu|villa)\b/i,
    },
    {
      type: 'APARTMENT',
      regex: /\b(can ho|chung cu|apartment|condo|condominium|flat)\b/i,
    },
    {
      type: 'COMMERCIAL',
      regex: /\b(thuong mai|van phong|mat bang|shophouse|commercial|office|retail)\b/i,
    },
    {
      type: 'LAND',
      regex: /\b(dat nen|dat tho cu|lo dat|dat|land|plot)\b/i,
    },
    {
      type: 'HOUSE',
      regex: /\b(nha pho|nha rieng|nha mat tien|nha o|nha cap 4|nha|house|townhouse|home)\b/i,
    },
    {
      type: 'OTHER',
      regex: /\b(nha xuong|kho xuong|warehouse)\b/i,
    },
  ];

  for (const rule of propertyRules) {
    if (rule.regex.test(ascii)) {
      filters.propertyType = rule.type;
      break;
    }
  }

  // 3. Price Bounds (Vietnamese & English units: tỷ/ty/ti/b/billion, triệu/trieu/tr/m/million)
  const unitGroup = '(ty|ti|trieu|tr|billion|million|b|m(?![23²³]))';
  const numGroup = '(\\d+(?:[.,]\\d+)?)';

  const priceRangeRegex = new RegExp(
    `(?:tu|from|between)?\\s*${numGroup}\\s*${unitGroup}?\\s*(?:den|toi|-|to|and)\\s*${numGroup}\\s*${unitGroup}\\b`,
    'i',
  );
  const priceUpperRegex = new RegExp(
    `(?:duoi|toi da|khong qua|nho hon|it hon|under|below|max|maximum|up to|less than|<)\\s*${numGroup}\\s*${unitGroup}\\b`,
    'i',
  );
  const priceLowerRegex = new RegExp(
    `(?:tren|toi thieu|tu|lon hon|hon|over|above|min|minimum|at least|more than|>)\\s*${numGroup}\\s*${unitGroup}\\b`,
    'i',
  );
  const priceApproxRegex = new RegExp(
    `(?:khoang|tam|quanh|around|about)\\s*${numGroup}\\s*${unitGroup}\\b`,
    'i',
  );

  const rangeMatch = ascii.match(priceRangeRegex);
  if (rangeMatch) {
    const val1 = parseDecimalNumber(rangeMatch[1]);
    const unit2 = rangeMatch[4];
    const unit1 = rangeMatch[2] || unit2;
    const val2 = parseDecimalNumber(rangeMatch[3]);
    const p1 = val1 * unitToMultiplier(unit1);
    const p2 = val2 * unitToMultiplier(unit2);
    const low = Math.min(p1, p2);
    const high = Math.max(p1, p2);
    filters.minPrice = toPositiveIntegerString(low);
    filters.maxPrice = toPositiveIntegerString(high);
  } else {
    const upperMatch = ascii.match(priceUpperRegex);
    if (upperMatch) {
      const val = parseDecimalNumber(upperMatch[1]);
      const mult = unitToMultiplier(upperMatch[2]);
      filters.maxPrice = toPositiveIntegerString(val * mult);
    }

    const lowerMatch = ascii.match(priceLowerRegex);
    if (lowerMatch) {
      const val = parseDecimalNumber(lowerMatch[1]);
      const mult = unitToMultiplier(lowerMatch[2]);
      filters.minPrice = toPositiveIntegerString(val * mult);
    }

    if (!upperMatch && !lowerMatch) {
      const approxMatch = ascii.match(priceApproxRegex);
      if (approxMatch) {
        const val = parseDecimalNumber(approxMatch[1]);
        const mult = unitToMultiplier(approxMatch[2]);
        const center = val * mult;
        filters.minPrice = toPositiveIntegerString(center * 0.75);
        filters.maxPrice = toPositiveIntegerString(center * 1.25);
      }
    }
  }

  // Ensure minPrice <= maxPrice if both are set
  if (filters.minPrice && filters.maxPrice) {
    if (BigInt(filters.minPrice) > BigInt(filters.maxPrice)) {
      const temp = filters.minPrice;
      filters.minPrice = filters.maxPrice;
      filters.maxPrice = temp;
    }
  }

  // 4. Area Bounds (m2, m², sqm, sq m)
  const areaUnit = '(?:m2|m²|sqm|sq\\s*m)';
  const areaRangeRegex = new RegExp(
    `(?:tu|from|between)?\\s*${numGroup}\\s*(?:${areaUnit})?\\s*(?:den|toi|-|to|and)\\s*${numGroup}\\s*${areaUnit}`,
    'i',
  );
  const areaLowerRegex = new RegExp(
    `(?:tren|tu|toi thieu|lon hon|hon|over|above|min|minimum|at least|from)\\s*${numGroup}\\s*${areaUnit}`,
    'i',
  );
  const areaUpperRegex = new RegExp(
    `(?:duoi|toi da|nho hon|under|below|max|maximum|up to|less than)\\s*${numGroup}\\s*${areaUnit}`,
    'i',
  );

  const areaRangeMatch = ascii.match(areaRangeRegex);
  if (areaRangeMatch) {
    const a1 = parseDecimalNumber(areaRangeMatch[1]);
    const a2 = parseDecimalNumber(areaRangeMatch[2]);
    filters.minArea = Math.min(a1, a2);
    filters.maxArea = Math.max(a1, a2);
  } else {
    const areaLowerMatch = ascii.match(areaLowerRegex);
    if (areaLowerMatch) {
      filters.minArea = parseDecimalNumber(areaLowerMatch[1]);
    }
    const areaUpperMatch = ascii.match(areaUpperRegex);
    if (areaUpperMatch) {
      filters.maxArea = parseDecimalNumber(areaUpperMatch[1]);
    }
  }

  // 5. Location (Province & District)
  for (const matcher of PROVINCE_MATCHERS) {
    if (matcher.patterns.some((pattern) => containsPhrase(ascii, pattern))) {
      filters.province = matcher.canonical;
      break;
    }
  }

  const numberedDistrictMatch = ascii.match(
    /\b(?:quan|q\.?|district|dist\.?)\s*(\d{1,2})\b/i,
  );
  if (numberedDistrictMatch) {
    filters.district = `Quận ${numberedDistrictMatch[1]}`;
  } else {
    for (const matcher of DISTRICT_MATCHERS) {
      if (matcher.patterns.some((pattern) => containsPhrase(ascii, pattern))) {
        filters.district = matcher.canonical;
        break;
      }
    }
  }

  return filters;
}

/**
 * Maps a sanitized public listing summary to a strict AI recommendation card payload.
 * Guarantees no private fields (streetAddress, latitude, longitude, ownerId, owner PII) exist.
 */
export function toAssistantRecommendation(
  listing: PublicListingSummary,
): AssistantListingRecommendation {
  const sortedImages = Array.isArray(listing.images)
    ? [...listing.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const primaryImage = sortedImages[0]?.url?.trim() || null;

  return {
    id: String(listing.id),
    title: String(listing.title ?? ''),
    priceVnd: String(listing.priceVnd ?? '0'),
    rentalPeriod: listing.rentalPeriod ?? null,
    areaSqm: Number(listing.areaSqm ?? 0),
    propertyType: listing.propertyType,
    transactionType: listing.transactionType,
    province: String(listing.province ?? ''),
    district: String(listing.district ?? ''),
    ward: listing.ward ? String(listing.ward) : null,
    thumbnailUrl: primaryImage,
  };
}

function summarizeFiltersText(
  filters: AssistantExtractedFilters,
  locale: 'vi' | 'en',
): string {
  const parts: string[] = [];

  if (filters.propertyType) {
    parts.push(getPropertyTypeLabel(filters.propertyType, locale));
  }
  if (filters.transactionType) {
    parts.push(
      locale === 'vi'
        ? filters.transactionType === 'FOR_SALE'
          ? 'mua bán'
          : 'cho thuê'
        : filters.transactionType === 'FOR_SALE'
          ? 'for sale'
          : 'for rent',
    );
  }
  if (filters.district || filters.province) {
    const loc = [filters.district, filters.province].filter(Boolean).join(', ');
    parts.push(locale === 'vi' ? `tại ${loc}` : `in ${loc}`);
  }
  if (filters.minPrice && filters.maxPrice) {
    parts.push(
      locale === 'vi'
        ? `giá từ ${formatVndPrice(filters.minPrice, { locale: 'vi' })} đến ${formatVndPrice(filters.maxPrice, { locale: 'vi' })}`
        : `priced between ${formatVndPrice(filters.minPrice, { locale: 'en' })} and ${formatVndPrice(filters.maxPrice, { locale: 'en' })}`,
    );
  } else if (filters.maxPrice) {
    parts.push(
      locale === 'vi'
        ? `giá tối đa ${formatVndPrice(filters.maxPrice, { locale: 'vi' })}`
        : `up to ${formatVndPrice(filters.maxPrice, { locale: 'en' })}`,
    );
  } else if (filters.minPrice) {
    parts.push(
      locale === 'vi'
        ? `giá từ ${formatVndPrice(filters.minPrice, { locale: 'vi' })}`
        : `from ${formatVndPrice(filters.minPrice, { locale: 'en' })}`,
    );
  }

  if (filters.minArea !== undefined && filters.maxArea !== undefined) {
    parts.push(
      locale === 'vi'
        ? `diện tích ${formatArea(filters.minArea, 'vi')} - ${formatArea(filters.maxArea, 'vi')}`
        : `area ${formatArea(filters.minArea, 'en')} - ${formatArea(filters.maxArea, 'en')}`,
    );
  } else if (filters.minArea !== undefined) {
    parts.push(
      locale === 'vi'
        ? `diện tích từ ${formatArea(filters.minArea, 'vi')}`
        : `area from ${formatArea(filters.minArea, 'en')}`,
    );
  } else if (filters.maxArea !== undefined) {
    parts.push(
      locale === 'vi'
        ? `diện tích tối đa ${formatArea(filters.maxArea, 'vi')}`
        : `area up to ${formatArea(filters.maxArea, 'en')}`,
    );
  }

  return parts.join(', ');
}

export function buildDeterministicAssistantReply(params: {
  locale: 'vi' | 'en';
  filters: AssistantExtractedFilters;
  recommendations: AssistantListingRecommendation[];
  isFallback: boolean;
  totalMatched: number;
}): string {
  const { locale, filters, recommendations, isFallback, totalMatched } = params;
  const criteriaSummary = summarizeFiltersText(filters, locale);

  if (recommendations.length === 0) {
    return locale === 'vi'
      ? 'Hiện chưa có tin đăng đã kiểm duyệt nào trên hệ thống phù hợp với yêu cầu của bạn. Bạn vui lòng thử điều chỉnh mức giá, khu vực hoặc loại bất động sản khác.'
      : 'There are currently no approved listings matching your request. Please try adjusting your price range, location, or property type.';
  }

  if (isFallback) {
    if (locale === 'vi') {
      return criteriaSummary
        ? `Không tìm thấy tin đăng khớp chính xác với tiêu chí (${criteriaSummary}). Dưới đây là ${recommendations.length} tin đăng đã kiểm duyệt gần nhất trên Batdongsan để bạn tham khảo:`
        : `Dưới đây là ${recommendations.length} tin đăng bất động sản đã kiểm duyệt mới nhất trên Batdongsan để bạn tham khảo:`;
    }
    return criteriaSummary
      ? `No exact approved listings matched (${criteriaSummary}). Here are ${recommendations.length} closest approved listings available on Batdongsan:`
      : `Here are ${recommendations.length} recent approved listings available on Batdongsan:`;
  }

  if (locale === 'vi') {
    const filterNote = criteriaSummary ? ` theo tiêu chí (${criteriaSummary})` : '';
    return `Tôi tìm thấy ${totalMatched} tin đăng đã kiểm duyệt phù hợp${filterNote}. Dưới đây là ${recommendations.length} gợi ý nổi bật nhất:`;
  }

  const filterNote = criteriaSummary ? ` matching (${criteriaSummary})` : '';
  return `I found ${totalMatched} approved ${totalMatched === 1 ? 'listing' : 'listings'}${filterNote}. Here are the top ${recommendations.length} recommendations:`;
}

/**
 * Optional server-side LLM enhancement strictly grounded in the retrieved approved listings.
 * Returns null if no API key is configured or if the external call fails, so callers
 * always fall back seamlessly to deterministic localized replies.
 */
export async function tryGenerateGroundedLlmReply(params: {
  message: string;
  locale: 'vi' | 'en';
  recommendations: AssistantListingRecommendation[];
  isFallback: boolean;
}): Promise<string | null> {
  const { message, locale, recommendations, isFallback } = params;
  if (recommendations.length === 0) {
    return null;
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!geminiKey && !openAiKey) {
    return null;
  }

  const groundedContext = recommendations.map((item) => ({
    id: item.id,
    title: item.title,
    price: formatVndPrice(item.priceVnd, {
      transactionType: item.transactionType,
      rentalPeriod: item.rentalPeriod,
      locale,
    }),
    area: formatArea(item.areaSqm, locale),
    location: formatAdministrativeLocation(item),
    propertyType: item.propertyType,
    transactionType: item.transactionType,
  }));

  const systemPrompt =
    locale === 'vi'
      ? 'Bạn là Trợ lý AI Bất động sản của Batdongsan. Chỉ tóm tắt ngắn gọn (2-3 câu) dựa trên danh sách tin đăng ĐÃ KIỂM DUYỆT được cung cấp. Tuyệt đối KHÔNG bịa đặt tin đăng, giá, số phòng ngủ, địa chỉ chi tiết hoặc thông tin pháp lý.'
      : 'You are the Batdongsan AI Property Assistant. Provide a brief 2-3 sentence summary strictly grounded in the provided APPROVED listings JSON. NEVER invent listings, prices, bedrooms, street addresses, or legal claims.';

  const userPrompt = `User query: ${message}\nExact match fallback: ${String(isFallback)}\nApproved listings JSON: ${JSON.stringify(groundedContext)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 220 },
          }),
        },
      );
      if (response.ok) {
        const json = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } else if (openAiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 220,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = json?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    }
  } catch {
    // Graceful fallback to deterministic response
  } finally {
    clearTimeout(timeout);
  }

  return null;
}
