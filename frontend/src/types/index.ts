/**
 * Batdongsan Frontend Shared TypeScript Contracts
 * Aligned with Backend NestJS DTOs & Prisma Enums
 */

export type Role = 'BUYER' | 'OWNER' | 'AGENT' | 'ADMIN';

export type RegistrationIntent = 'BUYER' | 'OWNER' | 'AGENT';

export type ListingStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type PropertyType =
  | 'APARTMENT'
  | 'HOUSE'
  | 'VILLA'
  | 'LAND'
  | 'COMMERCIAL'
  | 'OTHER';

export type TransactionType = 'FOR_SALE' | 'FOR_RENT';

export type RentalPeriod = 'MONTH' | 'QUARTER' | 'YEAR';

export type ContactRequestStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED';

export type MlsSharePermission = 'VIEW' | 'MANAGE';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  registrationIntent?: RegistrationIntent | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  registrationIntent?: RegistrationIntent;
}

export interface RegisterResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  registrationIntent?: RegistrationIntent | null;
  createdAt: string;
}

export interface CurrentUserResponse {
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface ListingImage {
  id: string;
  url: string;
  order: number;
}

/**
 * Public listing item returned by GET /api/listings.
 * Matches strict select projection in Backend ListingsService.getPublicListings.
 * Private fields (streetAddress, latitude, longitude, ownerId, owner PII) are excluded.
 */
export interface PublicListingSummary {
  id: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  priceVnd: string;
  rentalPeriod: RentalPeriod | null;
  areaSqm: number;
  province: string;
  district: string;
  ward: string | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  images: ListingImage[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicListingsResponse {
  data: PublicListingSummary[];
  meta: PaginationMeta;
}

export interface PublicListingsQuery {
  page?: number;
  limit?: number;
  province?: string;
  district?: string;
  ward?: string;
  propertyType?: PropertyType;
  transactionType?: TransactionType;
  minPrice?: string;
  maxPrice?: string;
  minArea?: number;
  maxArea?: number;
}

export interface CreateContactRequestInput {
  listingId: string;
  message?: string;
  contactConsent: boolean;
}

export interface ContactRequestResponse {
  id: string;
  listingId: string;
  buyerId: string;
  message: string | null;
  contactConsent: boolean;
  status: ContactRequestStatus;
  createdAt: string;
  assignedAgentId: string | null;
}

export * from './workspace';
export * from './admin';
