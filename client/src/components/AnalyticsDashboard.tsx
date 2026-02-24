import { useState, useEffect } from 'react'
import { api } from '../api'
import type { ChoreInstance, TeamMember } from '../api'
import { getAssigneeColor } from './TeamPanel'

// ── Month list ─────────────────────────────────────────────────────────────
interface MonthEntry { label: string; short: string; start: string; end: string; key: string }

function buildMonthList(count = 18): MonthEntry[] {
  const list: MonthEntry[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    list.push({
      label: d.toLocaleDateString(undefined, { month: 'long',  year: 'numeric' }),
      short: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      start: `${key}-01`,
      end:   last.toISOString().slice(0, 10),
      key,
    })
  }
  return list
}

// ── Streak helpers ─────────────────────────────────────────────────────────
function getWeekStart(dateStr: string): string {
  const d   = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

interface StreakRow { title: string; choreId: number; streak: number }

function computeStreaks(instances: ChoreInstance[]): StreakRow[] {
  const today            = new Date().toISOString().slice(0, 10)
  const currentWeekStart = getWeekStart(today)
  const recurring        = instances.filter(i => i.recurrence_type !== 'none' && i.occurrence_date <= today)
  if (!recurring.length) return []

  const byChore: Record<number, { title: string; items: ChoreInstance[] }> = {}
  recurring.forEach(i => {
    if (!byChore[i.chore_id]) byChore[i.chore_id] = { title: i.title, items: [] }
    byChore[i.chore_id].items.push(i)
  })

  const results: StreakRow[] = []
  for (const [idStr, { title, items }] of Object.entries(byChore)) {
    const weekMap: Record<string, { total: number; done: number }> = {}
    items.forEach(i => {
      const wk = getWeekStart(i.occurrence_date)
      if (!weekMap[wk]) weekMap[wk] = { total: 0, done: 0 }
      weekMap[wk].total++
      if (i.completed) weekMap[wk].done++
    })
    const weeks = Object.keys(weekMap).sort().reverse()
    let streak = 0
    for (const wk of weeks) {
      const { total, done } = weekMap[wk]
      if (wk === currentWeekStart) { if (done > 0) streak++; continue }
      if (done === total) streak++
      else break
    }
    if (streak > 0) results.push({ title, choreId: Number(idStr), streak })
  }
  return results.sort((a, b) => b.streak - a.streak)
}

// ── Helpers ────────────────────────────────────────────────────────────────
function rateColor(r: number) { return r >= 80 ? '#16a34a' : r >= 55 ? '#f59e0b' : '#ef4444' }
function rateLabel(r: number) { return r >= 80 ? 'Excellent' : r >= 55 ? 'Good' : 'Needs attention' }
function streakColor(n: number) { return n >= 8 ? '#16a34a' : n >= 4 ? '#f59e0b' : '#3b82f6' }

interface Props { members: TeamMember[]; onClose: () => void; darkMode: boolean }

export default function AnalyticsDashboard({ members, onClose, darkMode }: Props) {
  const months = buildMonthList(18)

  const [selectedKey,     setSelectedKey]     = useState(months[0].key)
  const [instances,       setInstances]       = useState<ChoreInstance[]>([])
  const [loading,         setLoading]         = useState(true)
  const [streakInstances, setStreakInstances] = useState<ChoreInstance[]>([])

  const month = months.find(m => m.key === selectedKey)!

  useEffect(() => {
    setLoading(true)
    api.getChores(month.start, month.end).then(setInstances).finally(() => setLoading(false))
  }, [selectedKey])

  useEffect(() => {
    const end = new Date(), start = new Date()
    start.setDate(start.getDate() - 89)
    api.getChores(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))
      .then(setStreakInstances)
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total = instances.length
  const done  = instances.filter(i => i.completed).length
  const rate  = total > 0 ? Math.round((done / total) * 100) : 0

  const memberStats = members
    .map(m => {
      const mine  = instances.filter(i => i.assignee_id === m.id)
      const mDone = mine.filter(i => i.completed).length
      return { member: m, assigned: mine.length, completed: mDone, rate: mine.length > 0 ? Math.round((mDone / mine.length) * 100) : 0 }
    })
    .filter(s => s.assigned > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed)

  const choreMap: Record<string, { done: number; total: number }> = {}
  instances.forEach(i => {
    if (!choreMap[i.title]) choreMap[i.title] = { done: 0, total: 0 }
    choreMap[i.title].total++
    if (i.completed) choreMap[i.title].done++
  })
  const choreRows = Object.entries(choreMap)
    .map(([title, s]) => ({ title, ...s, rate: Math.round((s.done / s.total) * 100) }))
    .sort((a, b) => b.done - a.done)

  const streaks = computeStreaks(streakInstances)

  // ── Theme ──────────────────────────────────────────────────────────────────
  const dk      = darkMode
  const panel   = dk ? '#1e293b' : '#fff'
  const card    = dk ? '#263548' : '#f8fafc'
  const border  = dk ? '#334155' : '#e2e8f0'
  const textPri = dk ? '#f1f5f9' : '#1e293b'
  const textSec = dk ? '#94a3b8' : '#64748b'
  const trackBg = dk ? '#334155' : '#e2e8f0'
  const selBg   = dk ? '#0f172a' : '#fff'
  const selColor = dk ? '#f1f5f9' : '#1e293b'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.35)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 60,
        width: '440px',
        display: 'flex', flexDirection: 'column',
        background: panel,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.28)',
        animation: 'slide-in-right 0.22s ease',
      }}>

        {/* ── Header ── */}
        <div className="header-animated" style={{
          padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: '10px',
          boxShadow: '0 2px 10px rgba(12,31,63,0.25)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>Analytics</h2>
            <p style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Monthly Reports
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Month picker */}
            <select
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff',
                borderRadius: '9px',
                padding: '5px 10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {months.map((m, i) => (
                <option key={m.key} value={m.key} style={{ background: selBg, color: selColor }}>
                  {i === 0 ? `${m.short} (now)` : m.short}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff',
                width: '32px', height: '32px',
                borderRadius: '8px',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {loading ? (
            <p style={{ color: textSec, textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Month title */}
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: textPri, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {month.label}
                </h3>
                <p style={{ fontSize: '0.8rem', color: textSec, marginTop: '4px' }}>
                  {total > 0 ? `${done} of ${total} chores completed` : 'No chores recorded this month.'}
                </p>
              </div>

              {total === 0 ? (
                <p style={{ color: textSec, fontStyle: 'italic', fontSize: '0.9rem' }}>Nothing to show.</p>
              ) : (<>

                {/* ── Two stat cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{done}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: textPri, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '6px' }}>Completed</div>
                    <div style={{ fontSize: '0.72rem', color: textSec, marginTop: '2px' }}>of {total} assigned</div>
                  </div>
                  <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: rateColor(rate), lineHeight: 1 }}>{rate}%</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: textPri, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '6px' }}>Rate</div>
                    <div style={{ fontSize: '0.72rem', color: rateColor(rate), fontWeight: 600, marginTop: '2px' }}>{rateLabel(rate)}</div>
                  </div>
                </div>

                {/* Overall bar */}
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team Progress</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: textSec }}>{done} / {total}</span>
                  </div>
                  <div style={{ height: '8px', background: trackBg, borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${rate}%`, background: rateColor(rate), borderRadius: '5px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* ── Team ── */}
                {memberStats.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Team Performance</p>
                    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
                      {memberStats.map((s, i) => {
                        const color = getAssigneeColor(s.member.id, members)
                        return (
                          <div key={s.member.id} style={{
                            padding: '0.75rem 1rem',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            borderBottom: i < memberStats.length - 1 ? `1px solid ${border}` : 'none',
                          }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                              {s.member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.member.name}</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexShrink: 0, marginLeft: '8px' }}>
                                  <span style={{ fontSize: '0.72rem', color: textSec }}>{s.completed}/{s.assigned}</span>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: rateColor(s.rate), minWidth: '38px', textAlign: 'right' }}>{s.rate}%</span>
                                </div>
                              </div>
                              <div style={{ height: '5px', background: trackBg, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${s.rate}%`, background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Chore breakdown ── */}
                {choreRows.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Chore Breakdown</p>
                    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
                      {choreRows.map((row, i) => (
                        <div key={row.title} style={{
                          padding: '0.7rem 1rem',
                          borderBottom: i < choreRows.length - 1 ? `1px solid ${border}` : 'none',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>{row.title}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.7rem', color: textSec }}>{row.done}/{row.total}</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: rateColor(row.rate), minWidth: '34px', textAlign: 'right' }}>{row.rate}%</span>
                            </div>
                          </div>
                          <div style={{ height: '4px', background: trackBg, borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${row.rate}%`, background: rateColor(row.rate), borderRadius: '3px', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </>)}

              {/* ── Streaks (always current, not month-specific) ── */}
              {streaks.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    Active Streaks
                    <span style={{ fontWeight: 500, textTransform: 'none', marginLeft: '6px', fontSize: '0.62rem' }}>(current, last 90 days)</span>
                  </p>
                  <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
                    {streaks.map((s, i) => (
                      <div key={s.choreId} style={{
                        padding: '0.7rem 1rem',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        borderBottom: i < streaks.length - 1 ? `1px solid ${border}` : 'none',
                      }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: textPri, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.title}
                        </span>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: streakColor(s.streak) + '20',
                          border: `1px solid ${streakColor(s.streak)}50`,
                          borderRadius: '20px',
                          padding: '3px 10px',
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                            {s.streak >= 8 ? '★' : s.streak >= 4 ? '▲' : '●'}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: streakColor(s.streak) }}>
                            {s.streak} wk{s.streak !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  )
}
