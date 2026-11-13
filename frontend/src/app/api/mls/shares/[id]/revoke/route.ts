import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { statusCode: 400, message: 'Mã chia sẻ MLS (id) là bắt buộc.' },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, message: 'Vui lòng đăng nhập để thu hồi chia sẻ MLS.' },
        { status: 401 },
      );
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === 'object' && 'reason' in body && typeof body.reason === 'string') {
        reason = body.reason.trim();
      }
    } catch {
      // Body is optional
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(
      `${backendUrl}/api/mls/shares/${encodeURIComponent(id.trim())}/revoke`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionCookie}`,
        },
        body: JSON.stringify({ reason }),
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    console.error('[RevokeMlsShareBFF] Error:', error);
    return NextResponse.json(
      { statusCode: 500, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

