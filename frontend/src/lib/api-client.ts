import {
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly errorDetails: string[];
  public readonly rawError?: string;

  constructor(statusCode: number, message: string | string[], rawError?: string) {
    const formattedMessage = Array.isArray(message) ? message.join(', ') : message;
    super(formattedMessage);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errorDetails = Array.isArray(message) ? message : [message];
    this.rawError = rawError;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Centralized HTTP request executor with timeout & error normalization
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 15000,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      // Handle HTTP 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      let data: Record<string, unknown> | null = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = (await response.json()) as Record<string, unknown>;
        } catch {
          data = null;
        }
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }

      if (!response.ok) {
        const statusCode = response.status;
        const message =
          (data?.message as string | string[] | undefined) ||
          (statusCode === 401
            ? 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ'
            : statusCode === 403
              ? 'Bạn không có quyền thực hiện thao tác này'
              : statusCode === 404
                ? 'Không tìm thấy tài nguyên yêu cầu'
                : statusCode === 409
                  ? 'Dữ liệu đã bị thay đổi đồng thời. Vui lòng tải lại trang và thử lại.'
                  : 'Đã xảy ra lỗi trên máy chủ. Vui lòng thử lại sau.');
        const rawError = data?.error as string | undefined;

        throw new ApiClientError(statusCode, message, rawError);
      }

      return data as unknown as T;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiClientError(
          408,
          'Yêu cầu quá thời gian chờ (Timeout). Vui lòng kiểm tra lại kết nối mạng.',
          'Request Timeout',
        );
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';

      throw new ApiClientError(
        500,
        errorMessage,
        'Network Error',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Authentication Endpoints (BFF) ───────────────────────────

  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  public async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getMe(): Promise<CurrentUserResponse> {
    return this.request<CurrentUserResponse>('/api/auth/me', {
      method: 'GET',
    });
  }

  public async logout(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
