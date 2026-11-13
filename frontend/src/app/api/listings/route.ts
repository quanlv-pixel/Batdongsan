import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

const VALID_PROPERTY_TYPES = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'LAND',
  'COMMERCIAL',
  'OTHER',
];

const VALID_TRANSACTION_TYPES = ['FOR_SALE', 'FOR_RENT'];
const VALID_RENTAL_PERIODS = ['MONTH', 'QUARTER', 'YEAR'];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, error: 'Unauthorized', message: 'Vui lòng đăng nhập để tạo tin đăng mới.' },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { statusCode: 400, message: 'Dữ liệu yêu cầu không hợp lệ (JSON malformed).' },
        { status: 400 },
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { statusCode: 400, message: 'Payload yêu cầu phải là một đối tượng JSON.' },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      propertyType,
      transactionType,
      priceVnd,
      rentalPeriod,
      areaSqm,
      province,
      district,
      ward,
      streetAddress,
      latitude,
      longitude,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 200) {
      return NextResponse.json(
        { statusCode: 400, message: 'Tiêu đề tin đăng phải từ 5 đến 200 ký tự.' },
        { status: 400 },
      );
    }

    if (typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { statusCode: 400, message: 'Mô tả tin đăng phải có ít nhất 10 ký tự.' },
        { status: 400 },
      );
    }

    if (typeof propertyType !== 'string' || !VALID_PROPERTY_TYPES.includes(propertyType)) {
      return NextResponse.json(
        { statusCode: 400, message: 'Loại bất động sản không hợp lệ.' },
        { status: 400 },
      );
    }

    if (typeof transactionType !== 'string' || !VALID_TRANSACTION_TYPES.includes(transactionType)) {
      return NextResponse.json(
        { statusCode: 400, message: 'Hình thức giao dịch không hợp lệ.' },
        { status: 400 },
      );
    }

    if (transactionType === 'FOR_RENT') {
      if (typeof rentalPeriod !== 'string' || !VALID_RENTAL_PERIODS.includes(rentalPeriod)) {
        return NextResponse.json(
          { statusCode: 400, message: 'Tin cho thuê bắt buộc phải có kỳ hạn thuê hợp lệ (MONTH, QUARTER, YEAR).' },
          { status: 400 },
        );
      }
    } else if (transactionType === 'FOR_SALE' && rentalPeriod !== undefined && rentalPeriod !== null) {
      return NextResponse.json(
        { statusCode: 400, message: 'Tin mua bán không được chứa kỳ hạn thuê (rentalPeriod).' },
        { status: 400 },
      );
    }

    const priceStr = typeof priceVnd === 'number' ? String(priceVnd) : typeof priceVnd === 'string' ? priceVnd.trim() : '';
    if (!/^[1-9]\d*$/.test(priceStr)) {
      return NextResponse.json(
        { statusCode: 400, message: 'Mức giá VNĐ phải là số nguyên dương lớn hơn 0.' },
        { status: 400 },
      );
    }

    const areaNum = typeof areaSqm === 'number' ? areaSqm : parseFloat(String(areaSqm));
    if (isNaN(areaNum) || areaNum < 1) {
      return NextResponse.json(
        { statusCode: 400, message: 'Diện tích sử dụng phải tối thiểu 1 m².' },
        { status: 400 },
      );
    }

    if (typeof province !== 'string' || province.trim() === '') {
      return NextResponse.json(
        { statusCode: 400, message: 'Tỉnh / Thành phố là bắt buộc.' },
        { status: 400 },
      );
    }

    if (typeof district !== 'string' || district.trim() === '') {
      return NextResponse.json(
        { statusCode: 400, message: 'Quận / Huyện là bắt buộc.' },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      propertyType,
      transactionType,
      priceVnd: priceStr,
      areaSqm: areaNum,
      province: province.trim(),
      district: district.trim(),
    };

    if (transactionType === 'FOR_RENT') {
      payload.rentalPeriod = rentalPeriod;
    }

    if (typeof ward === 'string' && ward.trim()) {
      payload.ward = ward.trim();
    }
    if (typeof streetAddress === 'string' && streetAddress.trim()) {
      payload.streetAddress = streetAddress.trim();
    }
    if (typeof latitude === 'number' && !isNaN(latitude)) {
      payload.latitude = latitude;
    }
    if (typeof longitude === 'number' && !isNaN(longitude)) {
      payload.longitude = longitude;
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    console.error('[CreateListingBFF] Error:', error);
    return NextResponse.json(
      { statusCode: 500, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
