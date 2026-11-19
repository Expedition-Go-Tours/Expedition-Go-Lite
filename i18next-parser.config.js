export default {
  locales: [
    'ca', 'cs', 'da', 'de-AT', 'de-CH', 'de', 'el', 'en-AU', 'en', 'es',
    'es-MX', 'et', 'fi', 'fr', 'he', 'hr', 'hu', 'id', 'it', 'ja', 'ko',
    'lt', 'lv', 'ms', 'nl', 'no', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru', 'sk',
    'sl', 'sr', 'sv', 'th', 'tr', 'uk', 'zh-CN', 'zh-HK', 'zh-TW',
  ],
  output: 'src/i18n/locales/$LOCALE.json',
  input: ['src/**/*.{ts,tsx}'],
  defaultLocale: 'en',
  namespaceSeparator: false,
  keySeparator: '.',
  createOldCatalogs: false,
  sort: true,
}
