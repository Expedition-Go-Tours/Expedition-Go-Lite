/**
 * Promo-code helpers shared by the booking widget and its tests.
 *
 * The validation contract (POST /tours/offers/validate-promo) and the pricing
 * contract (POST /expedition/checkout/calculate) both key the travel date as
 * `travelDate` — the widget previously sent `selectedDate`, which made every
 * promo validation fail with a 400. These helpers keep the payload shape and
 * the accepted code format in one tested place.
 */

export const PROMO_CODE_MIN_LENGTH = 3
export const PROMO_CODE_MAX_LENGTH = 30

/** Codes are normalized to trimmed uppercase and must be alphanumeric. */
export function normalizePromoCode(raw: string): string {
  return (raw || '').trim().toUpperCase()
}

export function isValidPromoCodeFormat(code: string): boolean {
  return new RegExp(`^[A-Z0-9]{${PROMO_CODE_MIN_LENGTH},${PROMO_CODE_MAX_LENGTH}}$`).test(code)
}

export interface PromoValidationPayload {
  promoCode: string
  tourId: string
  travelDate: string
  quantity: number
  basePrice?: number
}

/** Body for POST /tours/offers/validate-promo — `travelDate` is required. */
export function buildPromoValidationPayload(params: {
  code: string
  tourId: string
  dateISO: string
  quantity: number
  basePrice?: number
}): PromoValidationPayload {
  return {
    promoCode: normalizePromoCode(params.code),
    tourId: params.tourId,
    travelDate: params.dateISO,
    quantity: Math.max(1, Math.floor(params.quantity)),
    ...(params.basePrice != null && Number.isFinite(params.basePrice) ? { basePrice: params.basePrice } : {}),
  }
}
