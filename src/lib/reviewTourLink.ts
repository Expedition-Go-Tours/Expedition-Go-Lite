import { allTours } from '../components/data'

interface DestinationAlias {
  keywords: string[]
  destinations: string[]
}

/**
 * Ordered by specificity: the first group whose keyword appears in a review
 * title wins, so specific attractions ("aburi") beat generic cities ("accra").
 */
export const DESTINATION_ALIASES: DestinationAlias[] = [
  { keywords: ['cape coast', 'elmina', 'kakum'], destinations: ['Cape Coast', 'Elmina', 'Kakum', 'Central Region'] },
  { keywords: ['aburi', 'boti', 'umbrella rock'], destinations: ['Eastern Region', 'Aburi', 'Koforidua'] },
  { keywords: ['shai hills', 'ada foah'], destinations: ['Greater Accra', 'Ada Foah', 'Accra'] },
  { keywords: ['akosombo', 'lake volta', 'volta'], destinations: ['Volta Region', 'Akosombo', 'Ho'] },
  { keywords: ['mole'], destinations: ['Northern Region', 'Tamale', 'Mole'] },
  { keywords: ['kumasi', 'ashanti'], destinations: ['Kumasi'] },
  { keywords: ['accra', 'jamestown'], destinations: ['Accra', 'Greater Accra'] },
]

/** Destinations from the static local catalog, used when the API list is unavailable. */
export const STATIC_DESTINATIONS: string[] = Array.from(
  new Set(
    allTours
      .map((tour) => tour.location.replace(/,\s*Ghana$/i, '').trim())
      .filter(Boolean),
  ),
)

function destinationMatches(destination: string, candidate: string): boolean {
  const d = destination.toLowerCase()
  const c = candidate.toLowerCase()
  return d === c || d.startsWith(`${c},`) || d.includes(`, ${c}`)
}

/**
 * Resolve a review's tour title to a destination that exists in `available`.
 * Returns the matching destination string, or null when nothing applies.
 */
export function matchDestination(title: string, available: string[]): string | null {
  const t = title.toLowerCase()
  for (const alias of DESTINATION_ALIASES) {
    if (!alias.keywords.some((keyword) => t.includes(keyword))) continue
    for (const candidate of alias.destinations) {
      const found = available.find((destination) => destinationMatches(destination, candidate))
      if (found) return found
    }
  }
  return null
}

/** Build the local tours link for a resolved destination (falls back to all tours). */
export function buildTourLink(destination: string | null): string {
  return destination ? `/tours?location=${encodeURIComponent(destination)}` : '/tours'
}
