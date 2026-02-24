import confetti from 'canvas-confetti'
import type { ChoreInstance } from '../api'
import type { Season } from '../themes'

interface Props {
  instance: ChoreInstance
  onComplete: (choreId: number, date: string) => Promise<void>
  onUncomplete: (choreId: number, date: string) => Promise<void>
  onEdit: () => void
  onClose: () => void
  darkMode: boolean
  season: Season
}

function fireSeasonalConfetti(season: Season, isIncentive: boolean) {
  const base = {
    origin:        { x: 0.5, y: 0.6 },
    particleCount: isIncentive ? 160 : 90,
    spread:        isIncentive ? 160 : 130,
    startVelocity: 45,
    scalar:        2,
    ticks:         300,
  }

  if (season === 'winter') {
    const snowflake = confetti.shapeFromText({ text: '❄', scalar: 2 })
    confetti({ ...base, shapes: [snowflake], gravity: 0.55, colors: ['#bae6fd', '#7dd3fc', '#e0f2fe', '#ffffff'] })
  } else if (season === 'spring') {
    const petal = confetti.shapeFromText({ text: '🌸', scalar: 2 })
    confetti({ ...base, shapes: [petal] })
  } else if (season === 'summer') {
    // Double burst from two positions — beach colors, circles only
    const summerColors = ['#38bdf8', '#06b6d4', '#ec4899', '#a3e635', '#c084fc', '#4ade80', '#ffffff']
    const summerBase = { ...base, scalar: 1.3, shapes: ['circle'] as confetti.Options['shapes'], colors: summerColors, spread: 110 }
    confetti({ ...summerBase, origin: { x: 0.35, y: 0.6 } })
    confetti({ ...summerBase, origin: { x: 0.65, y: 0.6 } })
  } else if (season === 'autumn') {
    // Leaves drifting both ways + delayed cascade from above
    const leaf = confetti.shapeFromText({ text: '🍂', scalar: 2 })
    const autumnColors = ['#9f1239', '#c2410c', '#a16207', '#78350f', '#dc2626', '#fbbf24']
    confetti({ ...base, shapes: [leaf], gravity: 0.75, drift:  1, colors: autumnColors })
    confetti({ ...base, shapes: [leaf], gravity: 0.75, drift: -1, colors: autumnColors, particleCount: isIncentive ? 80 : 45 })
    setTimeout(() => {
      confetti({ ...base, shapes: [leaf], particleCount: isIncentive ? 60 : 35, gravity: 1.1, startVelocity: 20, spread: 80, colors: autumnColors, origin: { x: 0.5, y: 0.35 } })
    }, 400)
  } else {
    // Default — original navy behavior
    confetti({
      ...base,
      scalar: 1.3,
      colors: isIncentive
        ? ['#16a34a', '#fef08a', '#86efac', '#fbbf24', '#ffffff']
        : ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff', '#1e3a6e'],
    })
  }
}

export default function CompletionModal({ instance, onComplete, onUncomplete, onEdit, onClose, darkMode, season }: Props) {
  const dk = darkMode
  const modal  = dk ? '#1e293b' : '#fff'
  const border = dk ? '#334155' : '#e2e8f0'
  const textPri = dk ? '#f1f5f9' : '#1e293b'
  const textSec = dk ? '#64748b' : '#64748b'

  const handleComplete = async () => {
    await onComplete(instance.chore_id, instance.occurrence_date)
    fireSeasonalConfetti(season, !!instance.is_incentive)
    onClose()
  }

  const handleUncomplete = async () => {
    await onUncomplete(instance.chore_id, instance.occurrence_date)
    onClose()
  }

  const friendlyDate = new Date(instance.occurrence_date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="rounded-3xl shadow-2xl w-full mx-4"
        style={{ background: modal, maxWidth: '480px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              {instance.is_incentive && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold mb-3">
                  <span className="text-xl font-black text-green-600">$</span>
                  Incentive — Extra Pay Available!
                </div>
              )}
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: textPri, lineHeight: 1.2 }}>
                {instance.title}
              </h2>
              <p style={{ fontSize: '1rem', color: textSec, marginTop: '0.4rem' }}>{friendlyDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 leading-none flex-shrink-0"
              style={{ fontSize: '2rem' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          {instance.description && (
            <p style={{ fontSize: '1.05rem', color: textSec }}>{instance.description}</p>
          )}

          <div className="flex items-center gap-3">
            <span style={{ fontSize: '0.95rem', color: textSec }}>Assigned to:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: textPri }}>
              {instance.assignee_name || 'Unassigned'}
            </span>
          </div>

          {/* Status banner */}
          {instance.completed ? (
            <div className="flex items-center gap-4 p-5 bg-green-50 rounded-2xl border-2 border-green-200">
              <span style={{ fontSize: '2rem' }}>✓</span>
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>Completed!</p>
                {instance.completed_at && (
                  <p style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '2px' }}>
                    {new Date(instance.completed_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className={`p-5 rounded-2xl border-2 ${instance.is_incentive ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-200'}`}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: instance.is_incentive ? '#166534' : '#92400e' }}>
                {instance.is_incentive
                  ? 'Complete this to earn extra pay!'
                  : 'Not yet completed'}
              </p>
            </div>
          )}
        </div>

        {/* Footer — giant buttons for TV/kiosk */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          {instance.completed ? (
            <button
              onClick={handleUncomplete}
              className={`w-full rounded-2xl active:scale-95 transition-all font-bold ${dk ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              style={{ padding: '1.1rem', fontSize: '1.15rem' }}
            >
              Undo — Mark Incomplete
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="w-full bg-green-600 text-white rounded-2xl hover:bg-green-700 active:scale-95 transition-all font-bold shadow-lg"
              style={{ padding: '1.1rem', fontSize: '1.25rem' }}
            >
              ✓  Mark as Done
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl font-semibold"
              style={{ color: textSec, border: `2px solid ${border}`, padding: '0.85rem', fontSize: '1rem' }}
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex-1 text-blue-600 border-2 border-blue-200 rounded-2xl hover:bg-blue-50 font-semibold"
              style={{ padding: '0.85rem', fontSize: '1rem' }}
            >
              Edit Chore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
