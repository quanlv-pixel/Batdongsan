import {
  ListingImage,
  ListingStatus,
  MlsSharePermission,
  PaginationMeta,
  PropertyType,
  RentalPeriod,
  ContactRequestStatus,
  TransactionType,
  PublicListingSummary,
} from './index';

export interface ModerationLogEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface MyListingItem {
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
  streetAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  images: ListingImage[];
  moderationLogs?: ModerationLogEntry[];
}

export interface MyListingsResponse {
  data: MyListingItem[];
  meta: PaginationMeta;
}

export interface CreateListingInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  priceVnd: string;
  rentalPeriod?: RentalPeriod | null;
  areaSqm: number;
  province: string;
  district: string;
  ward?: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
}

export interface AssignedLeadBuyer {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export interface AssignedLeadItem {
  id: string;
  listingId: string;
  buyerId: string;
  message: string | null;
  contactConsent: boolean;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
  buyer: AssignedLeadBuyer;
  listing: PublicListingSummary;
}

export interface AssignedLeadsResponse {
  data: AssignedLeadItem[];
  meta: PaginationMeta;
}

export interface InquiryItem {
  id: string;
  listingId: string;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
  listing: PublicListingSummary;
}

export interface InquiriesResponse {
  data: InquiryItem[];
  meta: PaginationMeta;
}

export interface ReceivedMlsShareListing {
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
  streetAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  images: ListingImage[];
  owner: {
    id: string;
    fullName: string;
  };
}

export interface ReceivedMlsShareItem {
  id: string;
  permission: MlsSharePermission;
  expiresAt: string | null;
  createdAt: string;
  listing: ReceivedMlsShareListing;
}

export interface ReceivedMlsSharesResponse {
  data: ReceivedMlsShareItem[];
  meta: PaginationMeta;
}

export interface GrantMlsShareInput {
  listingId: string;
  recipientId: string;
  permission?: MlsSharePermission;
  expiresAt?: string;
}

export interface RevokeMlsShareInput {
  reason?: string;
}

export interface UpdateContactRequestStatusInput {
  status: ContactRequestStatus;
  note?: string;
}

export type WorkspaceTabKey =
  | 'my-listings'
  | 'leads'
  | 'mls'
  | 'inquiries';

