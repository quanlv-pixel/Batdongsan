import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppLocaleProvider } from '@/i18n';
import { AiAssistantWidget } from '@/components/assistant/AiAssistantWidget';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void _unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderWidget(locale: 'vi' | 'en' = 'vi') {
  return render(
    <AppLocaleProvider locale={locale} prefixEnabled={true}>
      <AiAssistantWidget />
    </AppLocaleProvider>,
  );
}

describe('AiAssistantWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens and closes via toggle, close button, and Escape key in Vietnamese', () => {
    renderWidget('vi');

    const toggle = screen.getByTestId('ai-assistant-toggle');
    expect(screen.queryByTestId('ai-assistant-panel')).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId('ai-assistant-panel')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Trợ lý AI BĐS' })).toBeTruthy();
    expect(
      screen.getByText(
        'Gợi ý dựa trên tin đăng đã kiểm duyệt trên Batdongsan; thông tin chỉ mang tính tham khảo.',
      ),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('ai-assistant-panel')).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId('ai-assistant-panel')).toBeTruthy();
    fireEvent.click(screen.getByTestId('ai-assistant-close'));
    expect(screen.queryByTestId('ai-assistant-panel')).toBeNull();
  });

  it('renders English UI strings when locale is en', () => {
    renderWidget('en');
    fireEvent.click(screen.getByTestId('ai-assistant-toggle'));

    expect(
      screen.getByRole('heading', { name: 'AI Property Assistant' }),
    ).toBeTruthy();
    expect(screen.getByText('Grounded in approved listings')).toBeTruthy();
    expect(
      screen.getByText('Apartments for sale under 8B'),
    ).toBeTruthy();
  });

  it('submits quick-prompt suggestion and renders recommendation cards linking to detail page', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reply: 'Tôi tìm thấy 1 tin đăng đã kiểm duyệt phù hợp.',
          recommendations: [
            {
              id: 'listing-123',
              title: 'Căn hộ Starlake Tây Hồ',
              priceVnd: '6500000000',
              rentalPeriod: null,
              areaSqm: 92,
              propertyType: 'APARTMENT',
              transactionType: 'FOR_SALE',
              province: 'Hà Nội',
              district: 'Tây Hồ',
              ward: 'Xuân La',
              thumbnailUrl: '/images/starlake.jpg',
            },
          ],
          appliedFilters: { transactionType: 'FOR_SALE', propertyType: 'APARTMENT' },
          isFallback: false,
          totalMatched: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderWidget('vi');
    fireEvent.click(screen.getByTestId('ai-assistant-toggle'));

    const suggestionBtn = screen.getByText('Căn hộ bán dưới 8 tỷ');
    fireEvent.click(suggestionBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Tôi tìm thấy 1 tin đăng đã kiểm duyệt phù hợp.'),
      ).toBeTruthy();
    });

    const card = screen.getByTestId('ai-recommendation-card');
    expect(card.getAttribute('href')).toBe('/vi/bat-dong-san/listing-123');
    expect(screen.getByText('Căn hộ Starlake Tây Hồ')).toBeTruthy();
    expect(screen.getByText('92 m²')).toBeTruthy();
  });

  it('supports form submission, error retry, and clearing conversation', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            reply: 'Here are the top 1 recommendations:',
            recommendations: [
              {
                id: 'listing-en-1',
                title: 'Hanoi Garden Villa',
                priceVnd: '15000000000',
                rentalPeriod: null,
                areaSqm: 200,
                propertyType: 'VILLA',
                transactionType: 'FOR_SALE',
                province: 'Hà Nội',
                district: 'Tây Hồ',
                ward: null,
                thumbnailUrl: null,
              },
            ],
            appliedFilters: {},
            isFallback: false,
            totalMatched: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    renderWidget('en');
    fireEvent.click(screen.getByTestId('ai-assistant-toggle'));

    const input = screen.getByTestId('ai-assistant-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Villa in Hanoi' } });
    fireEvent.click(screen.getByTestId('ai-assistant-submit'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Unable to reach the AI assistant right now. Please try again.',
        ),
      ).toBeTruthy();
    });

    const retryBtn = screen.getByTestId('ai-assistant-retry');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Here are the top 1 recommendations:'),
      ).toBeTruthy();
    });

    const card = screen.getByTestId('ai-recommendation-card');
    expect(card.getAttribute('href')).toBe('/en/bat-dong-san/listing-en-1');

    // Clear conversation
    fireEvent.click(screen.getByTestId('ai-assistant-clear'));
    expect(screen.queryByTestId('ai-recommendation-card')).toBeNull();
  });
});
