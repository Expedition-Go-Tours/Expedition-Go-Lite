import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/config'
import { LANGUAGES, resolveLanguage } from '../i18n/languages'
import { useCurrency, availableCurrencies } from '../contexts/CurrencyContext'
import { getLenis } from '../lib/LenisProvider'

interface LanguageCurrencyModalProps {
  onClose: () => void
  /** Tab to open on (used by the footer, which has separate Language and
      Currency buttons). Defaults to the language tab. */
  initialTab?: 'language' | 'currency'
}

const TABS = [
  { key: 'language' as const },
  { key: 'currency' as const },
]

type TabKey = (typeof TABS)[number]['key']

/**
 * The one language/currency picker.
 *
 * It is a centred dialog at every viewport width. The language list is the
 * whole catalogue — current locale first, then native names in a wide
 * 1 / 2 / 3-column grid — because 40+ locales no longer fit a short dropdown.
 */
export default function LanguageCurrencyModal({ onClose, initialTab = 'language' }: LanguageCurrencyModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [progress, setProgress] = useState(0)
  const currentLanguage = resolveLanguage(i18n.language)
  const orderedLanguages = currentLanguage
    ? [currentLanguage, ...LANGUAGES.filter((language) => language.code !== currentLanguage.code)]
    : LANGUAGES
  const { currency, setCurrency: setAppCurrency } = useCurrency()
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the latest onClose without re-running the mount effect: callers pass
  // an inline arrow, and re-running would re-lock scroll and re-focus on every
  // parent render.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    // Lock the page behind the dialog and put it back exactly as it was. The
    // root element is locked too because Lenis drives documentElement, and the
    // padding compensates for the scrollbar we just removed.
    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarGap = window.innerWidth - html.clientWidth
    const lenis = getLenis()

    lenis?.stop()
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      lenis?.start()
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousPaddingRight
      previouslyFocused?.focus?.()
    }
  }, [])

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const max = element.scrollHeight - element.clientHeight
    setProgress(max > 0 ? Math.min(100, Math.max(0, (element.scrollTop / max) * 100)) : 0)
  }

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab)
    if (tab === 'language') {
      if (scrollRef.current) scrollRef.current.scrollTop = 0
      setProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={activeTab === 'language' ? t('nav.language') : t('nav.currency')}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 flex max-h-[calc(100vh-1rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none supports-[height:100dvh]:max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]"
      >
        <div className="flex items-center justify-end border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Close' })}
            className="grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-4 sm:px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`relative flex-1 pb-3 pt-2 text-sm font-semibold transition text-center ${
                activeTab === tab.key
                  ? 'text-emerald-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.key === 'language' ? t('nav.language') : t('nav.currency')}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'language' && (
          <div className="h-1 w-full shrink-0 bg-slate-100" aria-hidden="true">
            <div
              className="h-full bg-blue-600 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div
          ref={scrollRef}
          data-lenis-prevent
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6 pt-4 sm:min-h-[320px] sm:px-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              {activeTab === 'language' && (
                <div
                  className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 sm:gap-y-5 lg:grid-cols-3"
                  data-testid="language-grid"
                >
                  {orderedLanguages.map((language) => {
                    const isCurrent = currentLanguage?.code === language.code
                    return (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() => { i18n.changeLanguage(language.code); onClose() }}
                        aria-pressed={isCurrent}
                        className={`flex min-w-0 items-start gap-2 py-2 text-left text-lg font-semibold leading-snug transition-colors sm:text-xl ${
                          isCurrent ? 'text-blue-600' : 'text-slate-900 hover:text-blue-600'
                        }`}
                      >
                        <span className="min-w-0 break-words" lang={language.code} dir="auto">
                          {language.label}
                        </span>
                        {isCurrent && (
                          <Check className="mt-0.5 size-5 shrink-0 text-blue-600 sm:size-6" aria-hidden="true" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {activeTab === 'currency' && (
                <div className="mx-auto grid w-full max-w-[560px] grid-cols-2 gap-2">
                  {availableCurrencies.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setAppCurrency(c.code); onClose() }}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        currency.code === c.code
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 shrink-0">
                        {c.symbol}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-medium leading-tight">{c.code}</span>
                        <span className="block text-[10px] text-slate-400 truncate leading-tight">{c.label}</span>
                      </div>
                      {currency.code === c.code && (
                        <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
