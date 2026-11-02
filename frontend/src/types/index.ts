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
