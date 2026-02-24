import React, { useRef, useCallback, useState, useEffect, memo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg, EventContentArg } from '@fullcalendar/core'
import type { ChoreInstance, TeamMember } from '../api'
import { getAssigneeColor } from './TeamPanel'
import type { Season, ThemeMode } from '../themes'

interface Props {
  instances: ChoreInstance[]
  members: TeamMember[]
  onEventClick: (instance: ChoreInstance) => void
  onDateRangeChange: (start: string, end: string) => void
  onAddChore: (date?: string) => void
  onComplete: (choreId: number, date: string) => void
  onUncomplete: (choreId: number, date: string) => void
  darkMode: boolean
  season: Season
  mode: ThemeMode
  onThemeChange: (s: Season, m: ThemeMode) => void
}

const INCENTIVE_COLOR  = '#92400e'
const INCENTIVE_BORDER = '#78350f'

const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign: 'right', marginRight: '1.5rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#93c5fd', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px' }}>
        {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  )
})

export default function CalendarView({ instances, members, onEventClick, onDateRangeChange, onAddChore, onComplete, onUncomplete, darkMode, season, mode, onThemeChange }: Props) {
  const calendarRef = useRef<FullCalendar>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resize calendar when container width changes (e.g. team panel open/close)
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize()
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])


  const [viewType, setViewType] = useState('dayGridMonth')
  const [localDateRange, setLocalDateRange] = useState<{ start: string; end: string } | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gearSpinning, setGearSpinning] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!settingsOpen) return
    const handle = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [settingsOpen])

  // Empty-day placeholders for week view
  const choresDates = new Set(instances.map(i => i.occurrence_date))
  const emptyPlaceholders = viewType === 'dayGridWeek' && localDateRange
    ? (() => {
        const result: object[] = []
        const d = new Date(localDateRange.start + 'T00:00:00')
        const end = new Date(localDateRange.end + 'T00:00:00')
        while (d < end) {
          const ds = d.toISOString().slice(0, 10)
          if (!choresDates.has(ds)) {
            result.push({ id: `empty-${ds}`, title: '', date: ds, allDay: true, backgroundColor: 'transparent', borderColor: 'transparent', classNames: ['no-chores-placeholder'], extendedProps: { isEmpty: true } })
          }
          d.setDate(d.getDate() + 1)
        }
        return result
      })()
    : []

  const events = [...instances.map(inst => {
    const baseColor = getAssigneeColor(inst.assignee_id, members, season)
    const isActiveIncentive = inst.is_incentive && !inst.completed
    return {
      id: inst.id,
      title: inst.title,
      date: inst.occurrence_date,
      allDay: true,
      backgroundColor: inst.completed ? '#94a3b8' : isActiveIncentive ? INCENTIVE_COLOR : baseColor,
      borderColor:     inst.completed ? '#64748b' : isActiveIncentive ? INCENTIVE_BORDER : baseColor,
      classNames: [
        inst.completed ? 'completed' : '',
        isActiveIncentive ? 'incentive-event' : '',
        !inst.completed && !isActiveIncentive ? 'pending-event' : '',
      ].filter(Boolean),
      extendedProps: { instance: inst },
    }
  }), ...emptyPlaceholders]

  const renderEventContent = useCallback((arg: EventContentArg) => {
    // Empty day placeholder
    if (arg.event.extendedProps.isEmpty) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', padding: '10px 4px',
          color: 'rgba(148,163,184,0.45)',
          fontSize: '0.72rem', fontStyle: 'italic', fontWeight: 500,
          letterSpacing: '0.03em', userSelect: 'none',
        }}>
          no chores
        </div>
      )
    }

    const inst = arg.event.extendedProps.instance as ChoreInstance
    const isIncentive = inst.is_incentive && !inst.completed
    const isDay  = arg.view.type === 'dayGridDay'
    const isWeek = arg.view.type === 'dayGridWeek'
    const ts = '0 2px 6px rgba(0,0,0,0.45)' // textShadow

    // ── DAY VIEW — big card layout ────────────────────────────────────────
    if (isDay) {
      const initials = inst.assignee_name ? inst.assignee_name.slice(0, 2).toUpperCase() : null

      // Shared card shell
      const cardInner = (symbol: string, symbolColor: string, glowColor: string, content: React.ReactNode, watermark?: string, badgeNode?: React.ReactNode) => (
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '22px',
          padding: '20px 26px 20px 30px',
          width: '100%',
          overflow: 'hidden',
        }}>
          {/* Gradient sheen */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.1) 100%)',
          }} />
          {/* Left accent strip */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
            background: 'rgba(255,255,255,0.4)',
          }} />
          {/* Background watermark */}
          <div style={{
            position: 'absolute', right: '16px', bottom: '-8px',
            fontSize: '11rem', fontWeight: 900, lineHeight: 1,
            color: 'rgba(255,255,255,0.07)',
            pointerEvents: 'none', userSelect: 'none',
            fontFamily: symbol === '$' ? 'Georgia, serif' : 'inherit',
            transform: 'rotate(-8deg)',
            letterSpacing: '-0.04em',
          }}>
            {watermark ?? symbol}
          </div>
          {/* Badge */}
          {badgeNode !== undefined ? badgeNode : (
            <div style={{
              width: symbol === '$' ? '92px' : '82px',
              height: symbol === '$' ? '92px' : '82px',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900,
              borderRadius: '50%',
              background: symbol === '$'
                ? 'rgba(254,240,138,0.22)'
                : `linear-gradient(145deg, ${glowColor}bb, ${glowColor}55)`,
              border: symbol === '$'
                ? '3px solid #fef08a'
                : `2px solid ${symbolColor}99`,
              fontSize: symbol === '$' ? '3.4rem' : '2.4rem',
              color: symbol === '$' ? '#fef08a' : symbolColor,
              textShadow: symbol === '$' ? 'none' : `0 2px 12px ${glowColor}99`,
              boxShadow: symbol === '$'
                ? '0 0 22px rgba(254,240,138,0.45)'
                : `0 4px 20px ${glowColor}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
              letterSpacing: '0.04em',
              fontFamily: symbol === '$' ? 'Georgia, serif' : 'inherit',
            }}>
              {symbol}
            </div>
          )}
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {content}
          </div>
        </div>
      )

      if (isIncentive) {
        return (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '22px', padding: '20px 28px 20px 28px', width: '100%', overflow: 'hidden' }}>
            {/* Animated shimmer overlay */}
            <div className="incentive-shimmer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            {/* Rich gradient sheen */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(254,240,138,0.18) 0%, rgba(0,0,0,0.15) 60%, rgba(254,240,138,0.08) 100%)' }} />
            {/* Left strip — gold */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: 'linear-gradient(180deg, #fef08a, #f59e0b, #fef08a)', borderRadius: '2px 0 0 2px' }} />
            {/* $ badge */}
            <div style={{
              width: '88px', height: '88px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, rgba(254,240,138,0.4), rgba(245,158,11,0.15))',
              border: '3px solid #fef08a',
              fontSize: '3.6rem', fontWeight: 900,
              color: '#fef08a',
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 24px rgba(254,240,138,1), 0 2px 6px rgba(0,0,0,0.5)',
              boxShadow: '0 0 28px rgba(254,240,138,0.55), 0 0 8px rgba(254,240,138,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>$</div>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '0.6rem', fontWeight: 900, color: '#fef08a',
                letterSpacing: '0.22em', textTransform: 'uppercase',
                background: 'rgba(254,240,138,0.12)',
                border: '1px solid rgba(254,240,138,0.35)',
                padding: '3px 10px', borderRadius: '20px',
                marginBottom: '10px',
              }}>
                ✦ &nbsp;Bonus Opportunity&nbsp; ✦
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', textShadow: ts, lineHeight: 1.1, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                {inst.title}
              </div>
              {inst.assignee_name && (
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>
                  {inst.assignee_name}
                </div>
              )}
            </div>
            {/* Watermark */}
            <div style={{ position: 'absolute', right: '12px', bottom: '-12px', fontSize: '11rem', fontWeight: 900, lineHeight: 1, color: 'rgba(254,240,138,0.07)', pointerEvents: 'none', userSelect: 'none', fontFamily: 'Georgia, serif', transform: 'rotate(-8deg)' }}>$</div>
          </div>
        )
      }

      const checkbox = (checked: boolean) => (
        <div
          onClick={e => {
            e.stopPropagation()
            checked ? onUncomplete(inst.chore_id, inst.occurrence_date) : onComplete(inst.chore_id, inst.occurrence_date)
          }}
          style={{
            width: '58px', height: '58px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '16px',
            border: checked ? '2.5px solid #86efac' : '2.5px solid rgba(255,255,255,0.6)',
            background: checked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
            cursor: 'pointer',
            fontSize: '1.8rem',
            color: checked ? '#86efac' : 'rgba(255,255,255,0.4)',
            boxShadow: checked ? '0 0 16px rgba(34,197,94,0.3)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {checked ? '✓' : ''}
        </div>
      )

      if (inst.completed) {
        return (
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            gap: '14px', padding: '10px 16px 10px 20px', width: '100%', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.1) 100%)' }} />
            {checkbox(true)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,255,255,0.25)', wordBreak: 'break-word', lineHeight: 1.2 }}>
                {inst.title}
              </div>
              {inst.assignee_name && (
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                  {inst.assignee_name}
                </div>
              )}
            </div>
          </div>
        )
      }

      // Regular pending
      return cardInner(
        '', '', '',
        <>
          <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', textShadow: ts, lineHeight: 1.1, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
            {inst.title}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: '5px' }}>
            {inst.assignee_name ?? 'Everyone'}
          </div>
        </>,
        inst.assignee_name ?? 'Team',
        checkbox(false)
      )
    }

    // ── WEEK VIEW — mini cards ────────────────────────────────────────────
    if (isWeek) {
      const statusIcon = isIncentive ? (
        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fef08a', flexShrink: 0, textShadow: '0 0 8px rgba(254,240,138,0.6)' }}>$</span>
      ) : inst.completed ? (
        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#86efac', flexShrink: 0 }}>✓</span>
      ) : null

      return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 8px 5px 10px', width: '100%', height: '100%', overflow: 'hidden' }}>
          {/* Gradient sheen */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.08) 100%)' }} />
          {/* Left strip */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'rgba(255,255,255,0.5)', borderRadius: '2px 0 0 2px' }} />
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '1rem', fontWeight: 800, color: inst.completed ? 'rgba(255,255,255,0.45)' : '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textDecoration: inst.completed ? 'line-through' : 'none',
              textDecorationColor: 'rgba(255,255,255,0.3)',
              letterSpacing: '-0.01em',
            }}>
              {inst.title}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: inst.completed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {inst.assignee_name ?? 'Everyone'}
            </div>
          </div>
          {statusIcon && <div style={{ flexShrink: 0 }}>{statusIcon}</div>}
        </div>
      )
    }

    // ── MONTH — compact ───────────────────────────────────────────────────
    if (isIncentive) {
      return (
        <div style={{ padding: '2px 6px', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#fef08a', flexShrink: 0 }}>$</span>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{inst.title}</div>
        </div>
      )
    }

    if (inst.completed) {
      return (
        <div style={{ padding: '2px 6px', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#86efac', flexShrink: 0 }}>✓</span>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{inst.title}</div>
        </div>
      )
    }

    return (
      <div style={{ padding: '2px 6px', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{inst.title}</div>
      </div>
    )
  }, [onComplete, onUncomplete])

  const handleEventClick = useCallback((arg: EventClickArg) => {
    onEventClick(arg.event.extendedProps.instance as ChoreInstance)
  }, [onEventClick])

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const start = arg.startStr.slice(0, 10)
    const end   = arg.endStr.slice(0, 10)
    onDateRangeChange(start, end)
    setLocalDateRange({ start, end })
    setViewType(arg.view.type)
  }, [onDateRangeChange])

  const handleDateClick = useCallback((arg: { dateStr: string }) => {
    onAddChore(arg.dateStr)
  }, [onAddChore])

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Header banner ── */}
      <div className="header-animated" style={{
        padding: '1.1rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(12,31,63,0.3)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Accent bar */}
            <div style={{ width: '5px', height: '2.8rem', borderRadius: '3px', background: 'var(--accent-bar)', flexShrink: 0 }} />
            <div>
              <h1 style={{
                fontSize: '2.1rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}>
                Orland Park Plastic Surgery
              </h1>
              <p style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--subtitle-color)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginTop: '3px',
              }}>
                Office Chore Schedule
              </p>
            </div>
          </div>
        </div>

        {/* Live clock */}
        <LiveClock />

        {/* Add Chore + Settings — grouped */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => onAddChore()}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.35)',
            color: '#fff',
            padding: '0.65rem 1.4rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.15s',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        >
          + Add Chore
        </button>

        {/* Settings */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setSettingsOpen(v => !v); setGearSpinning(true) }}
            title="Settings"
            className="gear-btn"
            style={{
              background: settingsOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.35)',
              color: '#fff',
              width: '2.6rem',
              height: '2.6rem',
              borderRadius: '12px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className={`gear-icon${gearSpinning ? ' spin-click' : ''}`}
              onAnimationEnd={() => setGearSpinning(false)}
            >⚙</span>
          </button>

          {settingsOpen && (() => {
            const cardBg  = darkMode ? '#1e293b' : '#fff'
            const textColor = darkMode ? '#f1f5f9' : '#1e293b'
            const hoverBg = darkMode ? '#263548' : '#f1f5f9'
            const SEASON_OPTIONS: { key: Season; label: string; icon: string }[] = [
              { key: 'classic', label: 'Default', icon: '' },
              { key: 'winter',  label: 'Winter',  icon: '❄️'  },
              { key: 'spring',  label: 'Spring',  icon: '🌸'  },
              { key: 'summer',  label: 'Summer',  icon: '☀️'  },
              { key: 'autumn',  label: 'Autumn',  icon: '🍂'  },
            ]
            return (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: cardBg,
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                padding: '10px',
                minWidth: '210px',
                zIndex: 100,
              }}>
                {/* Season label */}
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '2px' }}>
                  Theme
                </div>

                {/* Classic — full width */}
                {SEASON_OPTIONS.slice(0, 1).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => onThemeChange(opt.key, mode)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: '20px',
                      border: season === opt.key ? '2px solid transparent' : `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                      background: season === opt.key ? 'var(--header-gradient)' : cardBg,
                      backgroundSize: season === opt.key ? '300% 300%' : undefined,
                      animation: season === opt.key ? 'header-shift 10s ease infinite' : undefined,
                      color: season === opt.key ? '#fff' : textColor,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: '6px',
                    }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}

                {/* Seasons — 2-col grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                  {SEASON_OPTIONS.slice(1).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => onThemeChange(opt.key, mode)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '6px 8px',
                        borderRadius: '20px',
                        border: season === opt.key ? '2px solid transparent' : `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                        background: season === opt.key ? 'var(--header-gradient)' : cardBg,
                        backgroundSize: season === opt.key ? '300% 300%' : undefined,
                        animation: season === opt.key ? 'header-shift 10s ease infinite' : undefined,
                        color: season === opt.key ? '#fff' : textColor,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: darkMode ? '#334155' : '#e2e8f0', margin: '2px 0 6px' }} />

                {/* Dark / light toggle */}
                <button
                  onClick={() => { onThemeChange(season, mode === 'dark' ? 'light' : 'dark'); setSettingsOpen(false) }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    cursor: 'pointer',
                    border: 'none',
                    textAlign: 'left',
                    transition: 'background 0.12s',
                    color: textColor,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '1.1rem' }}>{darkMode ? '☀️' : '☾'}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </button>
              </div>
            )
          })()}
        </div>
        </div>{/* end grouped */}
      </div>

      {/* ── Calendar ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem', background: darkMode ? '#0f172a' : '#f1f5f9' }}>
        <div style={{
          background: darkMode ? '#1e293b' : '#fff',
          borderRadius: '16px',
          boxShadow: darkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
          padding: '1rem',
          height: 'calc(100% - 0px)',
          overflow: 'hidden',
        }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek,dayGridDay',
            }}
            events={events}
            eventContent={renderEventContent}
            dayCellContent={(arg) => {
              const d = arg.date
              return (
                <div style={{ width: '100%', padding: '2px 4px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <a className="fc-daygrid-day-number">{arg.dayNumberText}</a>
                  </div>
                </div>
              )
            }}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            height="100%"
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkText="more"
            views={{ dayGridDay: { dayMaxEvents: false }, dayGridWeek: { dayMaxEvents: false } }}
          />
        </div>
      </div>
    </div>
  )
}
