import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, message: 'Vui lòng đăng nhập để xem danh sách khách hàng được phân công.' },
        { status: 401 },
      );
    }

    const { search } = new URL(request.url);
    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(
      `${backendUrl}/api/contact-requests/assigned${search}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionCookie}`,
        },
        cache: 'no-store',
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    console.error('[ContactRequestsAssignedBFF] Error:', error);
    return NextResponse.json(
      { statusCode: 500, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

