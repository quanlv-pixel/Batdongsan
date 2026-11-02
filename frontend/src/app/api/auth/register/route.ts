import { NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = getBackendBaseUrl();

    // Whitelist only valid RegisterDto fields before sending to NestJS
    const payload: {
      email: string;
      password: string;
      fullName: string;
      registrationIntent?: string;
    } = {
      email: body.email,
      password: body.password,
      fullName: body.fullName,
    };

    if (body.registrationIntent) {
      payload.registrationIntent = body.registrationIntent;
    }

    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        statusCode: 500,
        message: 'Không thể kết nối đến máy chủ đăng ký. Vui lòng thử lại sau.',
        error: errorMsg,
      },
      { status: 500 },
    );
  }
}
