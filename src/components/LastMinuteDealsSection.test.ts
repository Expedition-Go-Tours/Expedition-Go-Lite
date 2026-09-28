import { describe, it, expect } from 'vitest'
import { mapOfferToCardProps } from '../components/LastMinuteDealsSection'
import type { HomepageOfferTour } from '../hooks/useHomepageSections'

/**
 * The offers payload carries two ids per row: `id`, the tour, and `offerId`,
 * the price/discount record hanging off it. A card links to /tour/{idOrSlug},
 * which the API resolves against *tours* — so the card has to carry the tour's
 * id or the link 404s.
 *
 * This shipped the offer id, which put "Tour not found" on every last-minute
 * card on both brands. Measured against the live API: for offer
 * cmt8txcri0465646pa9y6d76n, /api/tours, /api/expedition/tours and
 * /api/travioghana/tours all 404, while t.id cmt8hjkii00bo646phdiznmrr on the
 * same row resolves.
 *
 * The ids below are the real pair from that payload rather than invented ones,
 * so a test asserting on a slug cannot accidentally pass.
 */
const TOUR_ID = 'cmt8hjkii00bo646phdiznmrr'
const OFFER_ID = 'cmt8txcri0465646pa9y6d76n'
const SLUG = 'cape-coast-castle-elmina-castle-kakum-national-park-tour'

function offer(overrides: Partial<HomepageOfferTour> = {}): HomepageOfferTour {
  return {
    id: TOUR_ID,
    title: 'Cape Coast Castle, Elmina Castle & Kakum National Park Tour',
    slug: SLUG,
    coverPhoto: null,
    photos: [],
    category: null,
    city: 'Cape Coast',
    country: 'Ghana',
    averageRating: null,
    reviewCount: 0,
    totalBookings: 0,
    startingPrice: 120,
    currency: 'USD',
    durationMinutes: null,
    difficulty: null,
    tags: [],
    supplier: null,
    offerId: OFFER_ID,
    offerName: 'Last minute',
    offerType: 'PERCENTAGE',
    discountType: 'PERCENTAGE',
    discountPercentage: 10,
    fixedDiscountValue: null,
    startDate: null,
    endDate: null,
    specialOffers: [],
    ...overrides,
  }
}

describe('last-minute cards carry the tour id, not the offer id', () => {
  it('gives the card the tour id', () => {
    expect(mapOfferToCardProps(offer()).id).toBe(TOUR_ID)
  })

  it('never gives the card the offer id', () => {
    // The offer id is a real, non-empty string here, so a fallback that
    // reached for it would not look empty and would sail through a truthiness
    // check. Only equality catches it.
    expect(mapOfferToCardProps(offer()).id).not.toBe(OFFER_ID)
  })

  it('keeps the tour id when the row has no offer id at all', () => {
    const card = mapOfferToCardProps(offer({ offerId: '' }))
    expect(card.id).toBe(TOUR_ID)
  })

  it('does not fall back to the offer id when the tour id is missing', () => {
    // Guards the shape of the fix, not just its result. `t.id || t.offerId`
    // passes every other test in this file — it only differs on a row with no
    // t.id, which is exactly the row that would put a 404 link back. A blank
    // id fails the tour route, which is the correct outcome: it is loud rather
    // than quietly wrong.
    const card = mapOfferToCardProps(offer({ id: '' }))
    expect(card.id).toBe('')
    expect(card.id).not.toBe(OFFER_ID)
  })

  it('builds a link the tour route can resolve: the id and slug agree', () => {
    // The tour page takes the first path segment only, so a card whose id came
    // from the offer row is a card that 404s even when the slug is right.
    const card = mapOfferToCardProps(offer())
    expect(`/tour/${card.id}/${card.slug}`).toBe(`/tour/${TOUR_ID}/${SLUG}`)
  })

  it('stores an id that de-duplicates against the rest of the page', () => {
    // tourId is the wishlist key. Keyed on the offer id, the same tour appears
    // once per offer and the wishlist holds duplicates of one product.
    const one = mapOfferToCardProps(offer())
    const two = mapOfferToCardProps(
      offer({ offerId: 'cmt8u2922048d646p6uzoooe4', discountPercentage: 20 }),
    )
    expect(one.id).toBe(two.id)
  })

  it('keeps the offer-specific fields, so the discount is still shown', () => {
    // The id fix must not quietly cost the reason the card is on the page.
    const card = mapOfferToCardProps(offer())
    expect(card.discount).toBe('-10%')
    expect(card.specialOffers).toEqual([])
  })

  it('does not crash on a sparse offer row', () => {
    const card = mapOfferToCardProps(
      offer({
        title: '',
        slug: '',
        startingPrice: null,
        durationMinutes: null,
        city: null,
        country: null,
        discountType: '',
        discountPercentage: null,
      }),
    )
    expect(card.id).toBe(TOUR_ID)
  })
})
