/**
 * Supplier onboarding API client.
 *
 * Endpoints (all Bearer-auth protected, provided by Expedition-Go-Backend):
 *   POST /suppliers/apply              — submit a supplier application (multipart)
 *   GET  /suppliers/application/status — poll the current user's application status
 */
import { apiFetch } from './api'
import { getStoredAuthTokens } from './auth'

/** TravioAfrica-Supplier platform origin (approved suppliers SSO here). */
export const SUPPLIER_PLATFORM_URL =
  (import.meta.env.VITE_SUPPLIER_PLATFORM_URL as string | undefined) || 'https://supplier.travioafrica.com'

export interface SupplierAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
}

export interface SupplierProfile {
  id: string
  userId: string
  status: string
  businessInfo?: Record<string, unknown>
  operatingInfo?: Record<string, unknown>
  representativeInfo?: Record<string, unknown>
  payoutInfo?: Record<string, unknown>
  businessDocuments?: Record<string, unknown>
  compliance?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export type SupplierApplicationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'SUSPENDED'

/**
 * Submit a supplier application.
 * The payload must be multipart/form-data: each JSON section is appended as a
 * JSON-string field, and documents as file fields (matches the backend route
 * and multer upload configuration).
 */
export async function applyAsSupplier(payload: FormData): Promise<{ supplierProfile: SupplierProfile }> {
  return apiFetch('/suppliers/apply', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Get the current user's supplier application status.
 * Returns null when no application exists yet (backend responds 404).
 */
export async function getSupplierApplicationStatus(): Promise<SupplierProfile | null> {
  try {
    const payload = await apiFetch<{ supplierProfile: SupplierProfile }>('/suppliers/application/status')
    return payload?.supplierProfile ?? null
  } catch (err: unknown) {
    if ((err as { status?: number })?.status === 404) return null
    throw err
  }
}

/** Statuses that mean the supplier has been approved to use the platform. */
export function isApprovedSupplier(status?: string): boolean {
  return status === 'APPROVED' || status === 'ACTIVE'
}

/**
 * Build the TravioAfrica-Supplier SSO login URL for an approved supplier.
 * Pass an already-fetched profile to avoid a redundant status request.
 * Returns null when the user isn't signed in, isn't approved, or the status
 * check fails (so callers can fall back to the regular register flow).
 */
export async function getSupplierPortalUrl(profile?: SupplierProfile | null): Promise<string | null> {
  const { accessToken, refreshToken } = getStoredAuthTokens()
  if (!accessToken) return null

  let effectiveProfile = profile
  if (effectiveProfile === undefined) {
    try {
      effectiveProfile = await getSupplierApplicationStatus()
    } catch {
      return null
    }
  }

  if (!effectiveProfile || !isApprovedSupplier(effectiveProfile.status)) return null

  const params = new URLSearchParams({ accessToken })
  if (refreshToken) params.set('refreshToken', refreshToken)
  return `${SUPPLIER_PLATFORM_URL}/auth/callback?${params.toString()}`
}
