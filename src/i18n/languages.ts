/**
 * The locale catalogue shared by the language picker, the footer control and
 * i18next. Labels are deliberately native ("Français", not "French") so a
 * visitor can find their own language without reading English first.
 *
 * Keep this list in sync with the JSON files in `./locales` and with
 * `supportedLngs` in `./config`.
 */
export interface LanguageOption {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'ca', label: 'Català', flag: '🇪🇸' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'de-AT', label: 'Deutsch (Österreich)', flag: '🇦🇹' },
  { code: 'de-CH', label: 'Deutsch (Schweiz)', flag: '🇨🇭' },
  { code: 'de', label: 'Deutsch (Deutschland)', flag: '🇩🇪' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'en-AU', label: 'English (Australia)', flag: '🇦🇺' },
  { code: 'en', label: 'English (United States)', flag: '🇺🇸' },
  { code: 'es', label: 'Español (España)', flag: '🇪🇸' },
  { code: 'es-MX', label: 'Español (México)', flag: '🇲🇽' },
  { code: 'et', label: 'Eesti', flag: '🇪🇪' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
  { code: 'lv', label: 'Latviešu', flag: '🇱🇻' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (Portugal)', flag: '🇵🇹' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', label: 'Slovenščina', flag: '🇸🇮' },
  { code: 'sr', label: 'Српски', flag: '🇷🇸' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-HK', label: '繁體中文（香港）', flag: '🇭🇰' },
  { code: 'zh-TW', label: '繁體中文（台灣）', flag: '🇹🇼' },
]

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code.toLowerCase(), language]))

function normalise(value: string): string {
  return value.trim().replace(/_/g, '-').toLowerCase()
}

/**
 * Map any detected or stored language tag to one of our supported locales.
 *
 * Browser tags are not the same as our catalogue: `en-GB`, `pt`, `zh-Hant`
 * and `nb` all have to resolve to something we actually ship. Returning
 * `undefined` means "use English".
 */
export function resolveLanguage(value?: string | null): LanguageOption | undefined {
  if (!value) return undefined
  const tag = normalise(value)
  const exact = BY_CODE.get(tag)
  if (exact) return exact

  if (tag === 'es-419') return BY_CODE.get('es-mx')
  if (tag === 'zh-hant-hk') return BY_CODE.get('zh-hk')
  if (tag.startsWith('zh-hant')) return BY_CODE.get('zh-tw')
  if (tag === 'zh' || tag.startsWith('zh-hans')) return BY_CODE.get('zh-cn')
  if (tag === 'nb' || tag.startsWith('nb-') || tag === 'nn' || tag.startsWith('nn-')) {
    return BY_CODE.get('no')
  }
  if (tag === 'iw' || tag.startsWith('iw-')) return BY_CODE.get('he')
  if (tag === 'in' || tag.startsWith('in-')) return BY_CODE.get('id')
  if (tag === 'pt' || tag.startsWith('pt-')) return BY_CODE.get('pt-pt')

  return BY_CODE.get(tag.split('-')[0])
}
