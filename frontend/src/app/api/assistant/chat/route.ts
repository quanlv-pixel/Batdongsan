import { NextRequest, NextResponse } from 'next/server';
import {
  buildDeterministicAssistantReply,
  extractPropertySearchIntent,
  toAssistantRecommendation,
  tryGenerateGroundedLlmReply,
} from '@/lib/assistant-nlp';
import { fetchPublicListings } from '@/lib/public-listings';
import {
  AssistantChatResponse,
  AssistantHistoryItem,
  PublicListingsQuery,
} from '@/types';

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;

function sanitizeHistory(rawHistory: unknown): AssistantHistoryItem[] {
  if (!Array.isArray(rawHistory)) return [];
  const sanitized: AssistantHistoryItem[] = [];
  for (const item of rawHistory.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const role = record.role;
    const content = record.content;
    if (
      (role === 'user' || role === 'assistant') &&
      typeof content === 'string' &&
      content.trim().length > 0
    ) {
      sanitized.push({
        role,
        content: content.trim().slice(0, MAX_MESSAGE_LENGTH),
      });
    }
  }
  return sanitized;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.message !== 'string') {
    return NextResponse.json(
      { error: 'message must be a string' },
      { status: 400 },
    );
  }

  const trimmedMessage = payload.message.trim();
  if (trimmedMessage.length === 0 || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: `message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
      },
      { status: 400 },
    );
  }

  const locale: 'vi' | 'en' = payload.locale === 'en' ? 'en' : 'vi';

  if (payload.history !== undefined && !Array.isArray(payload.history)) {
    return NextResponse.json(
      { error: 'history must be an array when provided' },
      { status: 400 },
    );
  }
  // Sanitize bounded conversation history for validation & safety
  sanitizeHistory(payload.history);

  try {
    const filters = extractPropertySearchIntent(trimmedMessage);
    const hasFilters = Object.values(filters).some(
      (v) => v !== undefined && v !== '',
    );

    const strictQuery: PublicListingsQuery = {
      ...filters,
      limit: 4,
      page: 1,
    };

    let result = await fetchPublicListings(strictQuery);
    let isFallback = false;

    // Fallback relaxation if strict filters returned 0 results
    if (result.data.length === 0 && hasFilters) {
      isFallback = true;

      // Step 1: relax price/area/district, keep transactionType + propertyType + province
      const relaxedStep1: PublicListingsQuery = {
        limit: 4,
        page: 1,
      };
      if (filters.transactionType) {
        relaxedStep1.transactionType = filters.transactionType;
      }
      if (filters.propertyType) {
        relaxedStep1.propertyType = filters.propertyType;
      }
      if (filters.province) {
        relaxedStep1.province = filters.province;
      }

      if (
        relaxedStep1.transactionType ||
        relaxedStep1.propertyType ||
        relaxedStep1.province
      ) {
        result = await fetchPublicListings(relaxedStep1);
      }

      // Step 2: if still 0, keep only transactionType or query latest approved listings
      if (result.data.length === 0) {
        const relaxedStep2: PublicListingsQuery = { limit: 4, page: 1 };
        if (filters.transactionType) {
          relaxedStep2.transactionType = filters.transactionType;
        }
        result = await fetchPublicListings(relaxedStep2);
      }

      // Step 3: if still 0, query any latest approved listings
      if (result.data.length === 0 && filters.transactionType) {
        result = await fetchPublicListings({ limit: 4, page: 1 });
      }
    }

    const recommendations = result.data.slice(0, 4).map(toAssistantRecommendation);
    const totalMatched = result.meta?.total ?? recommendations.length;

    const llmReply = await tryGenerateGroundedLlmReply({
      message: trimmedMessage,
      locale,
      recommendations,
      isFallback,
    });

    const reply =
      llmReply ??
      buildDeterministicAssistantReply({
        locale,
        filters,
        recommendations,
        isFallback,
        totalMatched,
      });

    const responseBody: AssistantChatResponse = {
      reply,
      recommendations,
      appliedFilters: filters,
      isFallback,
      totalMatched,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Unable to process property assistant request at this time.' },
      { status: 500 },
    );
  }
}
