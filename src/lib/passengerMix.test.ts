import { describe, it, expect } from 'vitest'
import { validatePassengerMix } from './passengerMix'
import type { TravelerPricing } from './tourTypes'

const cat = (label: string, extra: Partial<TravelerPricing> = {}): TravelerPricing => ({
  label,
  price: 100,
  ...extra,
})

describe('validatePassengerMix', () => {
  it('returns no issues for a valid mix', () => {
    const cats = [cat('Adult'), cat('Child')]
    expect(validatePassengerMix(cats, { adult: 2, child: 1 }, { min: 1, max: 15 })).toEqual([])
  })

  it('flags a party below minParticipants', () => {
    const issues = validatePassengerMix([cat('Adult')], { adult: 1 }, { min: 2, max: 15 })
    expect(issues.some((i) => i.type === 'min')).toBe(true)
  })

  it('flags a party above maxParticipants', () => {
    const issues = validatePassengerMix([cat('Adult')], { adult: 16 }, { min: 1, max: 15 })
    expect(issues.some((i) => i.type === 'max')).toBe(true)
  })

  it('flags a disallowed category', () => {
    const cats = [cat('Adult'), cat('Senior', { notAllowed: true })]
    const issues = validatePassengerMix(cats, { adult: 1, senior: 1 }, { min: 1, max: 15 })
    expect(issues.some((i) => i.type === 'notAllowed')).toBe(true)
  })

  it('requires an adult/senior guardian when a category needsAdult', () => {
    const cats = [cat('Adult'), cat('Child', { needsAdult: true })]
    const without = validatePassengerMix(cats, { child: 2 }, { min: 1, max: 15 })
    expect(without.some((i) => i.type === 'needsAdult')).toBe(true)

    const withAdult = validatePassengerMix(cats, { adult: 1, child: 2 }, { min: 1, max: 15 })
    expect(withAdult.some((i) => i.type === 'needsAdult')).toBe(false)

    const withSenior = validatePassengerMix([cat('Adult'), cat('Senior'), cat('Child', { needsAdult: true })], { senior: 1, child: 1 }, { min: 1, max: 15 })
    expect(withSenior.some((i) => i.type === 'needsAdult')).toBe(false)
  })

  it('ignores zero counts', () => {
    const cats = [cat('Adult'), cat('Child', { needsAdult: true })]
    const issues = validatePassengerMix(cats, { adult: 2, child: 0 }, { min: 1, max: 15 })
    expect(issues.some((i) => i.type === 'needsAdult')).toBe(false)
  })
})
