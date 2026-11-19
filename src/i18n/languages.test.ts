import { describe, expect, it } from 'vitest'
import { LANGUAGES, resolveLanguage } from './languages'

describe('language catalogue', () => {
  it('ships the full live set', () => {
    expect(LANGUAGES).toHaveLength(41)
    expect(LANGUAGES.map((language) => language.code)).toEqual(
      expect.arrayContaining(['en', 'fr', 'de-AT', 'en-AU', 'es-MX', 'pt-BR', 'zh-TW']),
    )
  })

  it('resolves exact built-in tags', () => {
    expect(resolveLanguage('en')?.code).toBe('en')
    expect(resolveLanguage('en-AU')?.code).toBe('en-AU')
    expect(resolveLanguage('de_AT')?.code).toBe('de-AT')
    expect(resolveLanguage('pt-BR')?.code).toBe('pt-BR')
    expect(resolveLanguage('zh-HK')?.code).toBe('zh-HK')
  })

  it('maps browser variants to a shipped locale', () => {
    expect(resolveLanguage('en-GB')?.code).toBe('en')
    expect(resolveLanguage('fr-CA')?.code).toBe('fr')
    expect(resolveLanguage('es-419')?.code).toBe('es-MX')
    expect(resolveLanguage('pt')?.code).toBe('pt-PT')
    expect(resolveLanguage('zh')?.code).toBe('zh-CN')
    expect(resolveLanguage('zh-Hans')?.code).toBe('zh-CN')
    expect(resolveLanguage('zh-Hant')?.code).toBe('zh-TW')
    expect(resolveLanguage('zh-Hant-HK')?.code).toBe('zh-HK')
    expect(resolveLanguage('nb-NO')?.code).toBe('no')
    expect(resolveLanguage('nn')?.code).toBe('no')
    expect(resolveLanguage('iw')?.code).toBe('he')
    expect(resolveLanguage('in-ID')?.code).toBe('id')
  })

  it('returns undefined for an unknown or empty tag', () => {
    expect(resolveLanguage('')).toBeUndefined()
    expect(resolveLanguage(null)).toBeUndefined()
    expect(resolveLanguage('xx-ZZ')).toBeUndefined()
  })
})
