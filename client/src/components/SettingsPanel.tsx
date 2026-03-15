import { useState, useEffect } from 'react'
import { api } from '../api'
import type { SmsSettings } from '../api'
import type { Season, ThemeMode } from '../themes'

const SEASON_OPTIONS: { key: Season; label: string; icon: string }[] = [
  { key: 'classic', label: 'Default', icon: '' },
  { key: 'winter',  label: 'Winter',  icon: '❄️' },
  { key: 'spring',  label: 'Spring',  icon: '🌸' },
  { key: 'summer',  label: 'Summer',  icon: '☀️' },
  { key: 'autumn',  label: 'Autumn',  icon: '🍂' },
]

interface Props {
  onClose: () => void
  darkMode: boolean
  season: Season
  mode: ThemeMode
  onThemeChange: (s: Season, m: ThemeMode) => void
}

export default function SettingsPanel({ onClose, darkMode, season, mode, onThemeChange }: Props) {
  const dk = darkMode
  const panel   = dk ? '#1e293b' : '#fff'
  const card    = dk ? '#263548' : '#f8fafc'
  const border  = dk ? '#334155' : '#e2e8f0'
  const textPri = dk ? '#f1f5f9' : '#1e293b'
  const textSec = dk ? '#94a3b8' : '#64748b'
  const inputBg = dk ? '#0f172a' : '#fff'

  const [form, setForm] = useState<Partial<SmsSettings>>({
    twilio_sid: '', twilio_token: '', twilio_from: '', manager_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    api.getSettings().then(s => setForm(f => ({ ...f, ...s }))).catch(() => {})
  }, [])

  const set = (key: keyof SmsSettings, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await api.saveSettings(form)
      setFeedback({ ok: true, msg: 'Settings saved.' })
    } catch (err: any) {
      setFeedback({ ok: false, msg: err.message || 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setFeedback(null)
    try {
      const res = await api.testSMS()
      if (res.success) {
        setFeedback({ ok: true, msg: 'Test SMS sent! Check the manager\'s phone.' })
      } else {
        setFeedback({ ok: false, msg: res.error || 'Failed to send test SMS.' })
      }
    } catch (err: any) {
      setFeedback({ ok: false, msg: err.message || 'Failed to send test SMS.' })
    } finally {
      setTesting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: inputBg,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '0.85rem',
    color: textPri,
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginTop: '5px',
  }

  const labelStyle = {
    fontSize: '0.7rem',
    fontWeight: 800 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: textSec,
  }

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
        width: '400px',
        display: 'flex', flexDirection: 'column',
        background: panel,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.28)',
        animation: 'slide-in-right 0.22s ease',
      }}>

        {/* Header */}
        <div className="header-animated" style={{
          padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(12,31,63,0.25)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>Settings</h2>
            <p style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              SMS Notifications
            </p>
          </div>
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
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── Appearance ── */}
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Appearance</p>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Season picker */}
              <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: textSec, marginBottom: '8px' }}>Theme</p>
                <button
                  onClick={() => onThemeChange('classic', mode)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', padding: '6px 8px', borderRadius: '20px', marginBottom: '6px',
                    border: season === 'classic' ? '2px solid transparent' : `1px solid ${border}`,
                    background: season === 'classic' ? 'var(--header-gradient)' : card,
                    backgroundSize: season === 'classic' ? '300% 300%' : undefined,
                    animation: season === 'classic' ? 'header-shift 10s ease infinite' : undefined,
                    color: season === 'classic' ? '#fff' : textPri,
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Default
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {SEASON_OPTIONS.slice(1).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => onThemeChange(opt.key, mode)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '5px', padding: '6px 8px', borderRadius: '20px',
                        border: season === opt.key ? '2px solid transparent' : `1px solid ${border}`,
                        background: season === opt.key ? 'var(--header-gradient)' : card,
                        backgroundSize: season === opt.key ? '300% 300%' : undefined,
                        animation: season === opt.key ? 'header-shift 10s ease infinite' : undefined,
                        color: season === opt.key ? '#fff' : textPri,
                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      <span>{opt.icon}</span><span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark / light toggle */}
              <button
                onClick={() => onThemeChange(season, mode === 'dark' ? 'light' : 'dark')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: dk ? '#1e293b' : '#f1f5f9',
                  border: `1px solid ${border}`,
                  color: textPri, fontSize: '0.88rem', fontWeight: 600,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{dk ? '☀️' : '☾'}</span>
                {dk ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </button>
            </div>
          </div>

          {/* ── SMS Notifications ── */}
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>SMS Notifications</p>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div>
                <label style={labelStyle}>Twilio Account SID</label>
                <input
                  style={inputStyle}
                  value={form.twilio_sid || ''}
                  onChange={e => set('twilio_sid', e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div>
                <label style={labelStyle}>Twilio Auth Token</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={form.twilio_token || ''}
                  onChange={e => set('twilio_token', e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                />
              </div>

              <div>
                <label style={labelStyle}>From Number (Twilio)</label>
                <input
                  style={inputStyle}
                  value={form.twilio_from || ''}
                  onChange={e => set('twilio_from', e.target.value)}
                  placeholder="+1XXXXXXXXXX"
                />
              </div>

              <div>
                <label style={labelStyle}>Manager Phone</label>
                <input
                  style={inputStyle}
                  value={form.manager_phone || ''}
                  onChange={e => set('manager_phone', e.target.value)}
                  placeholder="+1XXXXXXXXXX"
                />
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '0.83rem',
                fontWeight: 600,
                background: feedback.ok ? (dk ? 'rgba(22,163,74,0.15)' : '#f0fdf4') : (dk ? 'rgba(239,68,68,0.15)' : '#fef2f2'),
                color: feedback.ok ? '#16a34a' : '#ef4444',
                border: `1px solid ${feedback.ok ? (dk ? 'rgba(22,163,74,0.3)' : '#bbf7d0') : (dk ? 'rgba(239,68,68,0.3)' : '#fecaca')}`,
              }}>
                {feedback.msg}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="header-animated"
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                  border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>

              <button
                onClick={handleTest}
                disabled={testing}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  fontSize: '0.9rem', fontWeight: 700,
                  color: dk ? '#93c5fd' : '#1d4ed8',
                  background: dk ? 'rgba(59,130,246,0.12)' : '#eff6ff',
                  border: `1.5px solid ${dk ? 'rgba(59,130,246,0.3)' : '#bfdbfe'}`,
                  cursor: testing ? 'not-allowed' : 'pointer',
                  opacity: testing ? 0.7 : 1,
                }}
              >
                {testing ? 'Sending…' : '📱 Send Test SMS'}
              </button>
            </div>
          </div>{/* end SMS section */}

            <p style={{ fontSize: '0.75rem', color: textSec, lineHeight: 1.5 }}>
              Only this device will send SMS notifications. Other installs without credentials configured will run silently.
            </p>

          </div>
        </div>
      </div>
    </>
  )
}
