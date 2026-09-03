import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { useAuthUser } from './useAuthUser'
import { getAuthUserId, getStoredAuthTokens } from '../lib/auth'
import { getSupplierApplicationStatus, getSupplierPortalUrl, isApprovedSupplier, type SupplierProfile } from '../lib/supplier'

/**
 * Reactive supplier-approval status for the signed-in user.
 *
 * This hook is the SINGLE source of truth for supplier status — Navbar,
 * RegisterPage and any portal-redirect path must reuse it (or its helpers)
 * instead of calling getSupplierApplicationStatus() directly, so one page
 * visit produces ONE status request instead of three.
 *
 * Returns isApproved=true only for statuses that can use the
 * TravioAfrica-Supplier platform (APPROVED / ACTIVE). Any failure or a
 * missing application resolves to "not approved" so callers can safely
 * fall back to the regular supplier-acquisition flow.
 */

export const SUPPLIER_STATUS_STALE_MS = 5 * 60 * 1000

export function supplierStatusKey(userId?: string | null) {
  return ['supplier', 'status', userId ?? 'none'] as const
}

/**
 * Resolve the supplier profile through the shared query cache, fetching only
 * when it is missing or stale. Callers that would otherwise fire their own
 * getSupplierApplicationStatus() should use this so concurrent requests
 * collapse into one.
 */
export async function ensureSupplierProfile(userId?: string | null): Promise<SupplierProfile | null> {
  return queryClient.fetchQuery<SupplierProfile | null>({
    queryKey: supplierStatusKey(userId),
    queryFn: getSupplierApplicationStatus,
    staleTime: SUPPLIER_STATUS_STALE_MS,
  })
}

/**
 * Build the SSO portal URL using the shared cache (no redundant status call).
 * Returns null when not signed in / not approved / check fails.
 */
export async function getPortalUrlShared(userId?: string | null): Promise<string | null> {
  const profile = await ensureSupplierProfile(userId)
  return getSupplierPortalUrl(profile)
}

export function useSupplierStatus() {
  const user = useAuthUser()
  const userId = getAuthUserId(user)
  const hasToken = Boolean(getStoredAuthTokens().accessToken)

  const { data, isLoading, isError } = useQuery<SupplierProfile | null>({
    queryKey: supplierStatusKey(userId),
    queryFn: getSupplierApplicationStatus,
    enabled: Boolean(userId && hasToken),
    staleTime: SUPPLIER_STATUS_STALE_MS,
    refetchOnWindowFocus: false,
    retry: 0,
  })

  return {
    profile: data ?? null,
    isApproved: isApprovedSupplier(data?.status),
    isLoading,
    isError,
  }
}
