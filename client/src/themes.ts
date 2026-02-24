export type Season = 'classic' | 'winter' | 'spring' | 'summer' | 'autumn'
export type ThemeMode = 'light' | 'dark'

export interface ThemeConfig {
  headerGradient: string
  todayGlowColor: string
  todayGlowRgb: string          // "r,g,b"
  todayBgLight: string
  todayBgDark: string
  todayNumberLight: string
  todayNumberDark: string
  moreLinkLight: string
  moreLinkDark: string
  accentBar: string
  subtitle: string
  palette: { bg: string; hex: string }[]
}

export const THEMES: Record<Season, ThemeConfig> = {
  classic: {
    headerGradient: 'linear-gradient(135deg, #0c1f3f, #1e3a6e, #2563a8, #1a4fa0, #0f3060, #0c1f3f)',
    todayGlowColor: '#3b82f6',
    todayGlowRgb: '59,130,246',
    todayBgLight: '#eff6ff',
    todayBgDark: '#1e3a5f',
    todayNumberLight: '#1e3a6e',
    todayNumberDark: '#93c5fd',
    moreLinkLight: '#1e3a6e',
    moreLinkDark: '#60a5fa',
    accentBar: '#60a5fa',
    subtitle: '#93c5fd',
    palette: [
      { bg: 'bg-blue-500',    hex: '#3b82f6' },
      { bg: 'bg-emerald-500', hex: '#10b981' },
      { bg: 'bg-violet-500',  hex: '#8b5cf6' },
      { bg: 'bg-orange-500',  hex: '#f97316' },
      { bg: 'bg-pink-500',    hex: '#ec4899' },
      { bg: 'bg-teal-500',    hex: '#14b8a6' },
      { bg: 'bg-red-500',     hex: '#ef4444' },
      { bg: 'bg-indigo-500',  hex: '#6366f1' },
    ],
  },

  winter: {
    headerGradient: 'linear-gradient(135deg, #0a1628, #0f2744, #1a4a8a, #2563a8, #1a4a8a, #0f2744, #0a1628)',
    todayGlowColor: '#7dd3fc',
    todayGlowRgb: '125,211,252',
    todayBgLight: '#e0f2fe',
    todayBgDark: '#0c2a47',
    todayNumberLight: '#0369a1',
    todayNumberDark: '#7dd3fc',
    moreLinkLight: '#0369a1',
    moreLinkDark: '#7dd3fc',
    accentBar: '#7dd3fc',
    subtitle: '#bae6fd',
    palette: [
      { bg: 'bg-sky-500',    hex: '#0ea5e9' },
      { bg: 'bg-blue-500',   hex: '#3b82f6' },
      { bg: 'bg-indigo-500', hex: '#6366f1' },
      { bg: 'bg-cyan-500',   hex: '#06b6d4' },
      { bg: 'bg-slate-500',  hex: '#64748b' },
      { bg: 'bg-violet-500', hex: '#8b5cf6' },
      { bg: 'bg-blue-700',   hex: '#1d4ed8' },
      { bg: 'bg-cyan-400',   hex: '#22d3ee' },
    ],
  },

  spring: {
    headerGradient: 'linear-gradient(135deg, #022c22, #064e3b, #037652, #059669, #037652, #064e3b, #022c22)',
    todayGlowColor: '#6ee7b7',
    todayGlowRgb: '110,231,183',
    todayBgLight: '#d1fae5',
    todayBgDark: '#022c22',
    todayNumberLight: '#065f46',
    todayNumberDark: '#6ee7b7',
    moreLinkLight: '#065f46',
    moreLinkDark: '#6ee7b7',
    accentBar: '#6ee7b7',
    subtitle: '#a7f3d0',
    palette: [
      { bg: 'bg-emerald-500', hex: '#10b981' },
      { bg: 'bg-green-500',   hex: '#22c55e' },
      { bg: 'bg-pink-400',    hex: '#f472b6' },
      { bg: 'bg-lime-500',    hex: '#84cc16' },
      { bg: 'bg-rose-400',    hex: '#fb7185' },
      { bg: 'bg-teal-500',    hex: '#14b8a6' },
      { bg: 'bg-fuchsia-400', hex: '#e879f9' },
      { bg: 'bg-green-700',   hex: '#15803d' },
    ],
  },

  summer: {
    headerGradient: 'linear-gradient(135deg, #0c4a6e, #0369a1, #0ea5e9, #38bdf8, #0ea5e9, #0369a1, #0c4a6e)',
    todayGlowColor: '#38bdf8',
    todayGlowRgb: '56,189,248',
    todayBgLight: '#f0f9ff',
    todayBgDark: '#0c4a6e',
    todayNumberLight: '#0369a1',
    todayNumberDark: '#7dd3fc',
    moreLinkLight: '#0369a1',
    moreLinkDark: '#7dd3fc',
    accentBar: '#7dd3fc',
    subtitle: '#bae6fd',
    palette: [
      { bg: 'bg-sky-500',     hex: '#0ea5e9' },
      { bg: 'bg-cyan-500',    hex: '#06b6d4' },
      { bg: 'bg-pink-500',    hex: '#ec4899' },
      { bg: 'bg-lime-500',    hex: '#84cc16' },
      { bg: 'bg-sky-400',     hex: '#38bdf8' },
      { bg: 'bg-teal-500',    hex: '#14b8a6' },
      { bg: 'bg-fuchsia-500', hex: '#d946ef' },
      { bg: 'bg-yellow-400',  hex: '#facc15' },
    ],
  },

  autumn: {
    headerGradient: 'linear-gradient(135deg, #431407, #7c2d12, #c2410c, #ea580c, #c2410c, #7c2d12, #431407)',
    todayGlowColor: '#fb923c',
    todayGlowRgb: '251,146,60',
    todayBgLight: '#fff7ed',
    todayBgDark: '#431407',
    todayNumberLight: '#9a3412',
    todayNumberDark: '#fb923c',
    moreLinkLight: '#9a3412',
    moreLinkDark: '#fb923c',
    accentBar: '#fb923c',
    subtitle: '#fed7aa',
    palette: [
      { bg: 'bg-orange-600', hex: '#ea580c' },
      { bg: 'bg-red-600',    hex: '#dc2626' },
      { bg: 'bg-amber-600',  hex: '#d97706' },
      { bg: 'bg-rose-600',   hex: '#e11d48' },
      { bg: 'bg-orange-800', hex: '#9a3412' },
      { bg: 'bg-yellow-600', hex: '#ca8a04' },
      { bg: 'bg-red-400',    hex: '#f87171' },
      { bg: 'bg-amber-400',  hex: '#fbbf24' },
    ],
  },
}

export function applyTheme(season: Season, mode: ThemeMode): void {
  const t = THEMES[season]
  const r = document.documentElement
  r.style.setProperty('--header-gradient', t.headerGradient)
  r.style.setProperty('--today-glow-color', t.todayGlowColor)
  r.style.setProperty('--today-glow-low',  `rgba(${t.todayGlowRgb},0.35)`)
  r.style.setProperty('--today-glow-high', `rgba(${t.todayGlowRgb},0.65)`)
  r.style.setProperty('--today-bg',        mode === 'dark' ? t.todayBgDark  : t.todayBgLight)
  r.style.setProperty('--today-number',    mode === 'dark' ? t.todayNumberDark : t.todayNumberLight)
  r.style.setProperty('--more-link',       mode === 'dark' ? t.moreLinkDark : t.moreLinkLight)
  r.style.setProperty('--accent-bar',      t.accentBar)
  r.style.setProperty('--subtitle-color',  t.subtitle)
}
