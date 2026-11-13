import {
  ListingStatus,
  PropertyType,
  TransactionType,
  RentalPeriod,
  Role,
  RegistrationIntent,
  ContactRequestStatus,
  MlsSharePermission,
  PaginationMeta,
} from './index';

export type AdminTabKey = 'moderation' | 'requests' | 'users' | 'mls';

export interface AdminListingOwner {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface ModerationLogItem {
  id: string;
  listingId?: string;
  fromStatus: ListingStatus;
  toStatus: ListingStatus;
  reason?: string | null;
  createdAt: string;
  moderator?: {
    id: string;
    fullName: string;
    email: string;
    role?: Role;
  };
}

export interface AdminListingItem {
  id: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  priceVnd: string;
  rentalPeriod?: RentalPeriod | null;
  areaSqm: number;
  province: string;
  district: string;
  ward?: string | null;
  streetAddress?: string | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  owner: AdminListingOwner;
  images: Array<{
    id: string;
    url: string;
    order: number;
  }>;
  moderationLogs?: ModerationLogItem[];
}

export interface AdminListingsResponse {
  data: AdminListingItem[];
  meta: PaginationMeta;
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  registrationIntent: RegistrationIntent;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    ownedListings: number;
    assignedRequests: number;
    contactRequests: number;
  };
}

export interface AdminUsersResponse {
  data: AdminUserItem[];
  meta: PaginationMeta;
}

export interface AdminAgentOption {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface RequestAssignmentHistoryItem {
  id: string;
  contactRequestId: string;
  agentId: string;
  agent: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  isActive: boolean;
  assignedAt: string;
  releasedAt?: string | null;
}

export interface AdminContactRequestItem {
  id: string;
  listingId: string;
  buyerId: string;
  message?: string | null;
  contactConsent: boolean;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
  buyer: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  listing: {
    id: string;
    title: string;
    propertyType: PropertyType;
    transactionType: TransactionType;
    priceVnd: string;
    status: ListingStatus;
    province: string;
    district: string;
  };
  assignments: RequestAssignmentHistoryItem[];
}

export interface AdminContactRequestsResponse {
  data: AdminContactRequestItem[];
  meta: PaginationMeta;
}

export interface AdminMlsShareItem {
  id: string;
  listingId: string;
  permission: MlsSharePermission;
  isActive: boolean;
  revokedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    propertyType: PropertyType;
    transactionType: TransactionType;
    priceVnd: string;
    status: ListingStatus;
    province: string;
    district: string;
  };
  grantedBy: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  receivedBy: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
}

export interface AdminMlsSharesResponse {
  data: AdminMlsShareItem[];
  meta: PaginationMeta;
}
