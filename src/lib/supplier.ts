/**
 * Supplier onboarding API client.
 *
 * Endpoints (all Bearer-auth protected, provided by Expedition-Go-Backend):
 *   POST /suppliers/apply              — submit a supplier application (multipart)
 *   GET  /suppliers/application/status — poll the current user's application status
 */
import { apiFetch } from './api'

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
