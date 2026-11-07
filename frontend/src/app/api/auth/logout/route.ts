import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('batdongsan_session');

    return NextResponse.json(
      { success: true, message: 'Đăng xuất thành công' },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        statusCode: 500,
        message: 'Lỗi khi đăng xuất.',
        error: errorMsg,
      },
      { status: 500 },
    );
  }
}
