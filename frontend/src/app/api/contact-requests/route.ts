import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        {
          statusCode: 401,
          message: 'Vui lòng đăng nhập để gửi yêu cầu liên hệ.',
          error: 'Unauthorized',
        },
        { status: 401 },
      );
    }

    let body: {
      listingId?: string;
      message?: string;
      contactConsent?: boolean;
    };

    try {
      body = (await request.json()) as {
        listingId?: string;
        message?: string;
        contactConsent?: boolean;
      };
    } catch {
      return NextResponse.json(
        {
          statusCode: 400,
          message: 'Dữ liệu yêu cầu không hợp lệ.',
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    const { listingId, message, contactConsent } = body ?? {};

    if (!listingId || typeof listingId !== 'string' || !listingId.trim()) {
      return NextResponse.json(
        {
          statusCode: 400,
          message: 'Mã bất động sản (listingId) không được để trống.',
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    if (contactConsent !== true) {
      return NextResponse.json(
        {
          statusCode: 400,
          message:
            'Bạn cần đồng ý với điều khoản liên hệ và chính sách bảo mật trước khi gửi.',
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    if (message && typeof message === 'string' && message.length > 1000) {
      return NextResponse.json(
        {
          statusCode: 400,
          message: 'Lời nhắn không được vượt quá 1000 ký tự.',
          error: 'Bad Request',
        },
        { status: 400 },
      );
    }

    const backendPayload: {
      listingId: string;
      contactConsent: boolean;
      message?: string;
    } = {
      listingId: listingId.trim(),
      contactConsent: true,
    };

    if (typeof message === 'string' && message.trim().length > 0) {
      backendPayload.message = message.trim();
    }

    const backendUrl = getBackendBaseUrl();
    const backendResponse = await fetch(`${backendUrl}/api/contact-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionCookie.value}`,
      },
      body: JSON.stringify(backendPayload),
    });

    if (backendResponse.status === 401) {
      cookieStore.delete('batdongsan_session');
      return NextResponse.json(
        {
          statusCode: 401,
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          error: 'Unauthorized',
        },
        { status: 401 },
      );
    }

    const responseData = await backendResponse
      .json()
      .catch(() => ({ message: 'Không thể xử lý yêu cầu phản hồi từ máy chủ.' }));

    if (!backendResponse.ok) {
      return NextResponse.json(responseData, {
        status: backendResponse.status,
      });
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        statusCode: 500,
        message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.',
        error: errorMsg,
      },
      { status: 500 },
    );
  }
}
