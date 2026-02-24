import { useState, useEffect } from 'react'
import type { TeamMember, CreateChorePayload, ChoreInstance } from '../api'

interface Props {
  instance?: ChoreInstance | null
  defaultDate?: string
  members: TeamMember[]
  onSave: (payload: CreateChorePayload, choreId?: number) => Promise<void>
  onDelete?: (choreId: number) => Promise<void>
  onClose: () => void
  darkMode: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const IN_OFFICE_DAYS = [1, 2, 3, 4] // Mon–Thu

const WEEK_LABELS: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', [-1 as number]: 'Last',
}

export default function ChoreModal({ instance, defaultDate, members, onSave, onDelete, onClose, darkMode }: Props) {
  const dk = darkMode
  const modal   = dk ? '#1e293b' : '#fff'
  const border  = dk ? '#334155' : '#e2e8f0'
  const inputBg = dk ? '#0f172a' : '#f8fafc'
  const cardBg  = dk ? '#263548' : '#f0f4f8'
  const textPri = dk ? '#f1f5f9' : '#1e293b'
  const textSec = dk ? '#94a3b8' : '#64748b'
  const labelC  = dk ? '#94a3b8' : '#6b7280'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState<number | ''>('')
  const [startDate, setStartDate] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'monthly_weekday' | 'custom'>('none')
  const [weekDays, setWeekDays] = useState<number[]>([])
  const [interval, setInterval] = useState(7)
  const [endDate, setEndDate] = useState('')
  const [isIncentive, setIsIncentive] = useState(false)
  const [monthlyWeekday, setMonthlyWeekday] = useState(1)
  const [monthlyWeek, setMonthlyWeek] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (instance) {
      setTitle(instance.title)
      setDescription(instance.description || '')
      setAssigneeId(instance.assignee_id || '')
      setStartDate(instance.occurrence_date)
      setRecurrence(instance.recurrence_type as typeof recurrence)
      setIsIncentive(instance.is_incentive)
    } else {
      setStartDate(defaultDate ?? new Date().toISOString().slice(0, 10))
    }
  }, [instance, defaultDate])

  const toggleDay = (day: number) => {
    setWeekDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleSubmit = async () => {
    if (!title.trim() || !startDate) return
    setSaving(true)
    setError(null)
    try {
      const payload: CreateChorePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        assignee_id: assigneeId === '' ? null : Number(assigneeId),
        start_date: startDate,
        recurrence_type: recurrence,
        recurrence_days: recurrence === 'weekly' ? weekDays : undefined,
        recurrence_interval: recurrence === 'custom' ? interval : undefined,
        recurrence_end_date: endDate || undefined,
        is_incentive: isIncentive,
        recurrence_weekday: recurrence === 'monthly_weekday' ? monthlyWeekday : undefined,
        recurrence_week: recurrence === 'monthly_weekday' ? monthlyWeek : undefined,
      }
      await onSave(payload, instance?.chore_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!instance || !onDelete) return
    if (!confirm('Delete this chore and all its future occurrences?')) return
    setSaving(true)
    try {
      await onDelete(instance.chore_id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ background: modal }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
          <h2 className="text-base font-semibold" style={{ color: textPri }}>
            {instance ? 'Edit Chore' : 'New Chore'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: textSec }}>×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>Title *</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
              placeholder="e.g. Clean the kitchen"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
              placeholder="Optional details..."
            />
          </div>

          {/* Incentive toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ border: `1px solid ${border}`, background: cardBg }}>
            <button
              type="button"
              onClick={() => setIsIncentive(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isIncentive ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isIncentive ? 'translate-x-5' : ''}`}
              />
            </button>
            <div>
              <p className="text-sm font-medium" style={{ color: textPri }}>
                <span className="text-green-600 font-bold mr-1">$</span> Incentive Opportunity
              </p>
              <p className="text-xs" style={{ color: textSec }}>Employees earn extra pay for completing this chore</p>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>Assignee</label>
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
            >
              <option value="">All Employees</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>Recurrence</label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as typeof recurrence)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
            >
              <option value="none">None (one-time)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly (same date)</option>
              <option value="monthly_weekday">Monthly (weekday — e.g. 2nd Monday)</option>
              <option value="custom">Custom (every N days)</option>
            </select>
          </div>

          {/* Weekly day picker */}
          {recurrence === 'weekly' && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: labelC }}>Repeat on</label>
              <div className="flex gap-1">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                      weekDays.includes(i)
                        ? 'bg-blue-600 text-white'
                        : dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly weekday picker */}
          {recurrence === 'monthly_weekday' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: labelC }}>Which week</label>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, -1] as const).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setMonthlyWeek(w)}
                      className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                        monthlyWeek === w
                          ? 'bg-blue-600 text-white'
                          : dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {WEEK_LABELS[w]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: labelC }}>
                  Day of week
                  <span className="ml-1 text-blue-600 font-normal">(Mon–Thu = in office)</span>
                </label>
                <div className="flex gap-1">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMonthlyWeekday(i)}
                      className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                        monthlyWeekday === i
                          ? 'bg-blue-600 text-white'
                          : IN_OFFICE_DAYS.includes(i)
                          ? dk ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-800/30 border border-blue-800' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          : dk ? 'bg-slate-700 text-slate-500 hover:bg-slate-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom interval */}
          {recurrence === 'custom' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>Every N days</label>
              <input
                type="number"
                min={1}
                value={interval}
                onChange={e => setInterval(Math.max(1, Number(e.target.value)))}
                className="w-24 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
              />
            </div>
          )}

          {/* End date (for recurring) */}
          {recurrence !== 'none' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: labelC }}>End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: inputBg, border: `1px solid ${border}`, color: textPri }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: `1px solid ${border}`, background: cardBg }}>
          {instance && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ color: textSec, border: `1px solid ${border}` }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim() || !startDate}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : instance ? 'Save Changes' : 'Create Chore'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
