import { describe, it, expect } from 'vitest'
import {
  buildPromoValidationPayload,
  isValidPromoCodeFormat,
  normalizePromoCode,
} from './promo'

describe('promo code helpers', () => {
  it('builds the validation payload with the travelDate key the backend requires', () => {
    const payload = buildPromoValidationPayload({
      code: '  spring25 ',
      tourId: 'tour-1',
      dateISO: '2026-08-25',
      quantity: 2,
      basePrice: 500,
    })
    expect(payload).toEqual({
      promoCode: 'SPRING25',
      tourId: 'tour-1',
      travelDate: '2026-08-25',
      quantity: 2,
      basePrice: 500,
    })
    // Regression guard: the widget previously sent `selectedDate`, which the
    // backend rejects — the key must be `travelDate`.
    expect(payload.travelDate).toBeDefined()
    expect('selectedDate' in payload).toBe(false)
  })

  it('omits basePrice when it is missing or not a number', () => {
    expect(buildPromoValidationPayload({ code: 'A1', tourId: 't', dateISO: '2026-08-25', quantity: 1 })).toEqual({
      promoCode: 'A1',
      tourId: 't',
      travelDate: '2026-08-25',
      quantity: 1,
    })
    expect(buildPromoValidationPayload({ code: 'A1', tourId: 't', dateISO: '2026-08-25', quantity: 1, basePrice: Number.NaN })).toEqual({
      promoCode: 'A1',
      tourId: 't',
      travelDate: '2026-08-25',
      quantity: 1,
    })
  })

  it('clamps quantity to a positive integer', () => {
    expect(buildPromoValidationPayload({ code: 'A1', tourId: 't', dateISO: '2026-08-25', quantity: 0 }).quantity).toBe(1)
    expect(buildPromoValidationPayload({ code: 'A1', tourId: 't', dateISO: '2026-08-25', quantity: -3 }).quantity).toBe(1)
  })

  it('accepts 3–30 character uppercase alphanumeric codes only', () => {
    expect(isValidPromoCodeFormat('SAVE10')).toBe(true)
    expect(isValidPromoCodeFormat('abc')).toBe(false) // not normalized
    expect(isValidPromoCodeFormat('SAVE10!')).toBe(false) // punctuation
    expect(isValidPromoCodeFormat('AB')).toBe(false) // too short
    expect(isValidPromoCodeFormat('A'.repeat(31))).toBe(false) // too long
    expect(isValidPromoCodeFormat('A'.repeat(30))).toBe(true)
  })

  it('normalizes codes to trimmed uppercase', () => {
    expect(normalizePromoCode('  save10 ')).toBe('SAVE10')
    expect(normalizePromoCode('')).toBe('')
  })
})
