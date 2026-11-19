import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import { LANGUAGE_CODES, resolveLanguage } from './languages'

// Only English ships in the entry bundle. Every other locale is fetched as a
// separate chunk the first time it's selected — the 40 bundles are ~3 MB in
// total, so downloading them up front would dwarf the app itself.
const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  ca: () => import('./locales/ca.json'),
  cs: () => import('./locales/cs.json'),
  da: () => import('./locales/da.json'),
  'de-AT': () => import('./locales/de-AT.json'),
  'de-CH': () => import('./locales/de-CH.json'),
  de: () => import('./locales/de.json'),
  el: () => import('./locales/el.json'),
  'en-AU': () => import('./locales/en-AU.json'),
  es: () => import('./locales/es.json'),
  'es-MX': () => import('./locales/es-MX.json'),
  et: () => import('./locales/et.json'),
  fi: () => import('./locales/fi.json'),
  fr: () => import('./locales/fr.json'),
  he: () => import('./locales/he.json'),
  hr: () => import('./locales/hr.json'),
  hu: () => import('./locales/hu.json'),
  id: () => import('./locales/id.json'),
  it: () => import('./locales/it.json'),
  ja: () => import('./locales/ja.json'),
  ko: () => import('./locales/ko.json'),
  lt: () => import('./locales/lt.json'),
  lv: () => import('./locales/lv.json'),
  ms: () => import('./locales/ms.json'),
  nl: () => import('./locales/nl.json'),
  no: () => import('./locales/no.json'),
  pl: () => import('./locales/pl.json'),
  'pt-BR': () => import('./locales/pt-BR.json'),
  'pt-PT': () => import('./locales/pt-PT.json'),
  ro: () => import('./locales/ro.json'),
  ru: () => import('./locales/ru.json'),
  sk: () => import('./locales/sk.json'),
  sl: () => import('./locales/sl.json'),
  sr: () => import('./locales/sr.json'),
  sv: () => import('./locales/sv.json'),
  th: () => import('./locales/th.json'),
  tr: () => import('./locales/tr.json'),
  uk: () => import('./locales/uk.json'),
  'zh-CN': () => import('./locales/zh-CN.json'),
  'zh-HK': () => import('./locales/zh-HK.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
}

function resolvedCode(lng: string | undefined): string {
  return resolveLanguage(lng)?.code ?? 'en'
}

function syncDocumentLanguage(lng: string | undefined) {
  if (typeof document !== 'undefined') document.documentElement.lang = resolvedCode(lng)
}

async function loadLocaleBundle(lng: string) {
  const code = resolvedCode(lng)
  if (code === 'en' || i18n.hasResourceBundle(code, 'translation')) return
  const loader = localeLoaders[code]
  if (!loader) return
  try {
    const mod = await loader()
    i18n.addResourceBundle(code, 'translation', mod.default ?? mod, true, true)
  } catch {
    // Offline or chunk-load failure: fall back to the bundled English strings.
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    supportedLngs: LANGUAGE_CODES,
    nonExplicitSupportedLngs: true,
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng) => resolveLanguage(lng)?.code ?? 'en',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      bindI18nStore: 'added',
    },
  })
  .then(() => {
    syncDocumentLanguage(i18n.language)
    return loadLocaleBundle(i18n.language)
  })

i18n.on('languageChanged', (lng) => {
  syncDocumentLanguage(lng)
  void loadLocaleBundle(lng)
})

export default i18n
