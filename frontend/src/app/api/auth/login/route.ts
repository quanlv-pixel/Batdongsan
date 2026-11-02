import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendBaseUrl } from '@/lib/server-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body ?? {};
    const backendUrl = getBackendBaseUrl();

    // Whitelist only email and password for NestJS LoginDto
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const { accessToken, user } = data;

    // Derive remaining validity from JWT exp claim on the server
    let jwtRemainingSec: number | null = null;
    try {
      if (typeof accessToken === 'string') {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          if (typeof payload.exp === 'number') {
            const nowSec = Math.floor(Date.now() / 1000);
            const diffSec = payload.exp - nowSec;
            if (diffSec > 0) {
              jwtRemainingSec = diffSec;
            }
          }
        }
      }
    } catch {
      jwtRemainingSec = null;
    }

    // Configure HttpOnly session or persistent cookie
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax';
      path: string;
      maxAge?: number;
    } = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };

    // Only set maxAge if rememberMe is true AND JWT has valid remaining lifetime
    // Cookie lifetime NEVER exceeds actual JWT remaining validity
    if (rememberMe === true && jwtRemainingSec !== null && jwtRemainingSec > 0) {
      cookieOptions.maxAge = Math.min(jwtRemainingSec, 7 * 24 * 60 * 60);
    }

    const cookieStore = await cookies();
    cookieStore.set('batdongsan_session', accessToken, cookieOptions);

    // Return user info only — never expose raw JWT to browser JavaScript
    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        statusCode: 500,
        message: 'Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.',
        error: errorMsg,
      },
      { status: 500 },
    );
  }
}
