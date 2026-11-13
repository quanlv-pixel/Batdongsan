import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'REJECTED'];

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { statusCode: 400, message: 'Mã yêu cầu liên hệ (id) là bắt buộc.' },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, message: 'Vui lòng đăng nhập để cập nhật trạng thái yêu cầu.' },
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

    const { status, note } = body as Record<string, unknown>;

    if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { statusCode: 400, message: `Trạng thái mới phải là một trong: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
      return NextResponse.json(
        { statusCode: 400, message: 'Ghi chú phải là chuỗi ký tự.' },
        { status: 400 },
      );
    }

    if (typeof note === 'string' && note.length > 500) {
      return NextResponse.json(
        { statusCode: 400, message: 'Ghi chú không được vượt quá 500 ký tự.' },
        { status: 400 },
      );
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(
      `${backendUrl}/api/contact-requests/${encodeURIComponent(id.trim())}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionCookie}`,
        },
        body: JSON.stringify({
          status,
          note: typeof note === 'string' ? note.trim() : undefined,
        }),
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    console.error('[ContactRequestStatusBFF] Error:', error);
    return NextResponse.json(
      { statusCode: 500, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

