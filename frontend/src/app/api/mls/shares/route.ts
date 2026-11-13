import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

const ALLOWED_PERMISSIONS = ['VIEW', 'MANAGE'];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, message: 'Vui lòng đăng nhập để chia sẻ tin đăng MLS.' },
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

    const { listingId, recipientId, permission, expiresAt } = body as Record<string, unknown>;

    if (typeof listingId !== 'string' || listingId.trim() === '') {
      return NextResponse.json(
        { statusCode: 400, message: 'Mã tin đăng (listingId) là bắt buộc.' },
        { status: 400 },
      );
    }

    if (typeof recipientId !== 'string' || recipientId.trim() === '') {
      return NextResponse.json(
        { statusCode: 400, message: 'Mã môi giới người nhận (recipientId) là bắt buộc.' },
        { status: 400 },
      );
    }

    if (permission !== undefined && (typeof permission !== 'string' || !ALLOWED_PERMISSIONS.includes(permission))) {
      return NextResponse.json(
        { statusCode: 400, message: `Quyền chia sẻ phải là một trong: ${ALLOWED_PERMISSIONS.join(', ')}` },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {
      listingId: listingId.trim(),
      recipientId: recipientId.trim(),
      permission: permission || 'VIEW',
    };

    if (expiresAt) {
      payload.expiresAt = expiresAt;
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/mls/shares`, {
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
    console.error('[GrantMlsShareBFF] Error:', error);
    return NextResponse.json(
      { statusCode: 500, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

