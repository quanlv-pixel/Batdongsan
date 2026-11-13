import {
  PropertyType,
  RentalPeriod,
  TransactionType,
} from './index';

export type AssistantRole = 'user' | 'assistant';

export interface AssistantHistoryItem {
  role: AssistantRole;
  content: string;
}

export interface AssistantExtractedFilters {
  transactionType?: TransactionType;
  propertyType?: PropertyType;
  province?: string;
  district?: string;
  minPrice?: string;
  maxPrice?: string;
  minArea?: number;
  maxArea?: number;
}

export interface AssistantListingRecommendation {
  id: string;
  title: string;
  priceVnd: string;
  rentalPeriod: RentalPeriod | null;
  areaSqm: number;
  propertyType: PropertyType;
  transactionType: TransactionType;
  province: string;
  district: string;
  ward: string | null;
  thumbnailUrl: string | null;
}

export interface AssistantChatRequest {
  message: string;
  locale?: 'vi' | 'en';
  history?: AssistantHistoryItem[];
}

export interface AssistantChatResponse {
  reply: string;
  recommendations: AssistantListingRecommendation[];
  appliedFilters: AssistantExtractedFilters;
  isFallback: boolean;
  totalMatched: number;
}
