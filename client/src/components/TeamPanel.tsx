import { useState } from 'react'
import type { TeamMember, ChoreInstance } from '../api'
import { THEMES } from '../themes'
import type { Season } from '../themes'

interface Props {
  members: TeamMember[]
  instances: ChoreInstance[]
  onAdd: (name: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
  open: boolean
  onToggle: () => void
  filterAssigneeId: number | null
  onFilterChange: (id: number) => void
  darkMode: boolean
  season: Season
  onAnalyticsOpen: () => void
}

export function getAssigneeColor(assigneeId: number | null, members: TeamMember[], season: Season): string {
  if (!assigneeId) return '#64748b'
  const member = members.find(m => m.id === assigneeId)
  if (!member) return '#64748b'
  const palette = THEMES[season].palette
  return palette[member.id % palette.length].hex
}

export function getMemberBgClass(memberId: number, season: Season): string {
  const palette = THEMES[season].palette
  return palette[memberId % palette.length].bg
}

export default function TeamPanel({ members, instances, onAdd, onRemove, open, onToggle, filterAssigneeId, onFilterChange, darkMode, season, onAnalyticsOpen }: Props) {
  const dk = darkMode
  const palette = THEMES[season].palette
  const accentColor = THEMES[season].accentBar
  const panel   = dk ? '#1e293b' : '#fff'
  const border  = dk ? '#334155' : '#e2e8f0'
  const cardBg  = dk ? '#263548' : '#f8fafc'
  const textPri = dk ? '#cbd5e1' : '#1e293b'
  const textSec = dk ? '#94a3b8' : '#64748b'
  const inputBg = dk ? '#1e293b' : '#fff'
  const [newName, setNewName] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  // Derived stats from instances
  const now       = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const today     = now.toISOString().slice(0, 10)

  // M: monthly completions per member
  const monthlyDone: Record<number, number> = {}
  instances.forEach(i => {
    if (i.completed && i.assignee_id !== null && i.occurrence_date.startsWith(thisMonth)) {
      monthlyDone[i.assignee_id] = (monthlyDone[i.assignee_id] ?? 0) + 1
    }
  })

  // N: today's chore status per member — 'done' | 'pending' | undefined
  const todayStatus: Record<number, 'done' | 'pending'> = {}
  instances
    .filter(i => i.occurrence_date === today && i.assignee_id !== null)
    .forEach(i => {
      const id = i.assignee_id!
      if (!i.completed) todayStatus[id] = 'pending'
      else if (todayStatus[id] === undefined) todayStatus[id] = 'done'
    })

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    await onAdd(name)
    setNewName('')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: panel,
      borderLeft: `1px solid ${border}`,
      width: open ? '240px' : '48px',
      transition: 'width 0.2s',
      flexShrink: 0,
      boxShadow: '-2px 0 12px rgba(0,0,0,0.06)',
    }}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        style={{
          height: '48px',
          width: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '1.3rem',
          flexShrink: 0,
          borderBottom: `1px solid ${border}`,
          background: 'transparent',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        title={open ? 'Collapse' : 'Expand'}
      >
        {open ? '›' : '‹'}
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '1rem' }}>

          {/* Section title */}
          <p style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#64748b',
            marginBottom: '0.5rem',
          }}>
            Team
          </p>

          {/* Analytics button */}
          <button
            onClick={onAnalyticsOpen}
            className="header-animated"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '7px 10px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '8px',
              cursor: 'pointer',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>📊</span> Analytics
          </button>

          {/* All / clear filter button */}
          <button
            onClick={() => filterAssigneeId !== null && onFilterChange(filterAssigneeId)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '7px 10px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '8px',
              cursor: filterAssigneeId !== null ? 'pointer' : 'default',
              background: filterAssigneeId === null ? accentColor : cardBg,
              color: filterAssigneeId === null ? '#fff' : textSec,
              border: '1px solid',
              borderColor: filterAssigneeId === null ? accentColor : border,
              transition: 'all 0.15s',
            }}
          >
            {filterAssigneeId === null ? '● Showing All' : '← Show All'}
          </button>

          {/* Member list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
            {members.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No members yet</p>
            )}
            {members.map(m => {
              const isActive = filterAssigneeId === m.id
              return (
                <div
                  key={m.id}
                  className="group"
                  onClick={() => onFilterChange(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isActive ? palette[m.id % palette.length].hex : cardBg,
                    border: '2px solid',
                    borderColor: isActive ? palette[m.id % palette.length].hex : border,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  {/* Color avatar + today status dot (N) */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActive ? palette[m.id % palette.length].hex : '#fff',
                        background: isActive ? '#fff' : palette[m.id % palette.length].hex,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        letterSpacing: '0.03em',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    {todayStatus[m.id] && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0px',
                        right: '-1px',
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        background: todayStatus[m.id] === 'done' ? '#16a34a' : '#f59e0b',
                        border: `2px solid ${isActive ? palette[m.id % palette.length].hex : cardBg}`,
                        transition: 'background 0.2s',
                      }} />
                    )}
                  </div>

                  {/* Name */}
                  <span style={{
                    flex: 1,
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: isActive ? '#fff' : textPri,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                  }}>
                    {m.name}
                  </span>

                  {/* Monthly completion count (M) */}
                  {(monthlyDone[m.id] ?? 0) > 0 && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: isActive ? 'rgba(255,255,255,0.85)' : '#16a34a',
                      background: isActive ? 'rgba(255,255,255,0.18)' : (dk ? 'rgba(22,163,74,0.15)' : '#f0fdf4'),
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.25)' : (dk ? 'rgba(22,163,74,0.3)' : '#bbf7d0')}`,
                      padding: '1px 5px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      letterSpacing: '0.01em',
                    }}>
                      {monthlyDone[m.id]}✓
                    </span>
                  )}

                  {/* Remove (only visible on hover when not filtering) */}
                  {!isActive && (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmRemove(m.id) }}
                      className="opacity-0 group-hover:opacity-100"
                      style={{
                        color: '#94a3b8',
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'color 0.15s, opacity 0.15s',
                        padding: '2px',
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add member */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '0.85rem' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="New member name..."
              style={{
                width: '100%',
                fontSize: '0.85rem',
                border: `1px solid ${border}`,
                borderRadius: '8px',
                padding: '8px 10px',
                marginBottom: '8px',
                outline: 'none',
                color: textPri,
                background: inputBg,
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleAdd}
              className="header-animated"
              style={{
                width: '100%',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#fff',
                borderRadius: '8px',
                padding: '9px 0',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 6px rgba(30,58,110,0.3)',
              }}
            >
              + Add Member
            </button>
          </div>
        </div>
      )}

      {/* Confirm remove */}
      {confirmRemove !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl shadow-xl p-6 w-72" style={{ background: panel }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: textPri }}>Remove member?</h3>
            <p className="text-sm mb-5" style={{ color: textSec }}>Their chores will become <strong>Unassigned</strong>.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 px-3 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => { await onRemove(confirmRemove); setConfirmRemove(null) }}
                className="flex-1 px-3 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
