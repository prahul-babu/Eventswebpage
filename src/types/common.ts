/**
 * Common Timestamp interface compatible with both Firebase Client SDK & Admin SDK
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

/**
 * Health check response structure
 */
export interface HealthCheckResponse {
  ok: boolean;
  ts: string;
}

/**
 * Base entity for application-layer objects (Timestamps mapped to Date)
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base entity for database-layer Firestore documents (Timestamps as native Firestore Timestamps)
 */
export interface FirestoreBaseEntity {
  id: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * Pagination metadata and query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  lastVisibleId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  lastVisibleId?: string;
}

/**
 * Standard API Response envelope
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
