import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

const stripNonDigits = (value: string): string => value.replace(/\D/g, '')

/**
 * Build a canonical E.164 phone number from a country calling code
 * (e.g. "+233") and a national number (e.g. "024 123 4567").
 *
 * Tolerates input that already contains a full international number
 * (legacy localStorage drafts) and common formatting such as spaces,
 * hyphens, parentheses and a leading "0" national prefix.
 *
 * Returns the canonical E.164 string (e.g. "+233241234567"), or null
 * when the combined value is not a valid phone number. Uses the same
 * `libphonenumber-js` validation as the backend so both sides agree.
 */
export function buildE164Phone(countryCode: string, nationalNumber: string): string | null {
  const cc = (countryCode ?? '').trim()
  const raw = (nationalNumber ?? '').trim()
  if (!raw) return null

  const alreadyInternational = raw.startsWith('+')
  const candidate = alreadyInternational
    ? raw
    : `${cc.startsWith('+') ? '' : '+'}${cc}${stripNonDigits(raw)}`

  if (!candidate || candidate === '+') return null

  try {
    if (isValidPhoneNumber(candidate)) {
      const parsed = parsePhoneNumber(candidate)
      if (parsed?.number) return parsed.number
    }
  } catch {
    return null
  }
  return null
}

export function isValidPhoneInput(countryCode: string, nationalNumber: string): boolean {
  return buildE164Phone(countryCode, nationalNumber) !== null
}
