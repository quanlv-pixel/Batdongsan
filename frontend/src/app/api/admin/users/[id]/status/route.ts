import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('batdongsan_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { statusCode: 401, error: 'Unauthorized', message: 'Vui lòng đăng nhập với quyền quản trị viên.' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    console.error('[AdminUpdateUserStatusBFF] Error:', error);
    return NextResponse.json(
      { statusCode: 500, message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
