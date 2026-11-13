import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { statusCode: 401, message: 'Unauthenticated', error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const backendUrl = getBackendBaseUrl();
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionCookie.value}`,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid on backend — clear cookie
      cookieStore.delete('batdongsan_session');
      return NextResponse.json(
        { statusCode: 401, message: 'Session expired', error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        statusCode: 500,
        message: 'Lỗi xác thực người dùng. Vui lòng thử lại sau.',
        error: 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
