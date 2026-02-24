import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import type { TeamMember, ChoreInstance, CreateChorePayload } from './api'
import CalendarView from './components/CalendarView'
import ChoreModal from './components/ChoreModal'
import CompletionModal from './components/CompletionModal'
import TeamPanel from './components/TeamPanel'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import { requestNotificationPermission, scheduleNotificationsForToday } from './notifications'
import { applyTheme } from './themes'
import type { Season, ThemeMode } from './themes'

type ModalState =
  | { type: 'none' }
  | { type: 'chore'; instance?: ChoreInstance; defaultDate?: string }
  | { type: 'completion'; instance: ChoreInstance }

export default function App() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [instances, setInstances] = useState<ChoreInstance[]>([])
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [teamPanelOpen, setTeamPanelOpen] = useState(true)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [filterAssigneeId, setFilterAssigneeId] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [notified, setNotified] = useState(false)
  const [season, setSeason] = useState<Season>(() => {
    try { return (JSON.parse(localStorage.getItem('theme') || '{}').season ?? 'classic') as Season }
    catch { return 'classic' }
  })
  const [mode, setMode] = useState<ThemeMode>(() => {
    try { return (JSON.parse(localStorage.getItem('theme') || '{}').mode ?? 'dark') as ThemeMode }
    catch { return 'dark' }
  })

  useEffect(() => {
    applyTheme(season, mode)
    localStorage.setItem('theme', JSON.stringify({ season, mode }))
  }, [season, mode])

  const setTheme = useCallback((s: Season, m: ThemeMode) => {
    setSeason(s)
    setMode(m)
  }, [])

  // Load team members once
  useEffect(() => {
    api.getTeam().then(setMembers).catch(console.error)
  }, [])

  // Load chore instances when date range changes
  const loadInstances = useCallback(async (start: string, end: string) => {
    try {
      const data = await api.getChores(start, end)
      setInstances(data)
      if (!notified) {
        const granted = await requestNotificationPermission()
        if (granted) {
          scheduleNotificationsForToday(data)
          setNotified(true)
        }
      }
    } catch (err) {
      console.error('Failed to load chores:', err)
    }
  }, [notified])

  useEffect(() => {
    if (dateRange) {
      loadInstances(dateRange.start, dateRange.end)
    }
  }, [dateRange, loadInstances])

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setDateRange({ start, end })
  }, [])

  const refreshInstances = useCallback(() => {
    if (dateRange) loadInstances(dateRange.start, dateRange.end)
  }, [dateRange, loadInstances])

  // Team handlers
  const handleAddMember = async (name: string) => {
    const member = await api.addMember(name)
    setMembers(prev => [...prev, member])
  }

  const handleRemoveMember = async (id: number) => {
    await api.removeMember(id)
    setMembers(prev => prev.filter(m => m.id !== id))
    refreshInstances()
  }

  // Chore handlers
  const handleSaveChore = async (payload: CreateChorePayload, choreId?: number) => {
    if (choreId) {
      await api.updateChore(choreId, payload)
    } else {
      await api.createChore(payload)
    }
    refreshInstances()
  }

  const handleDeleteChore = async (choreId: number) => {
    await api.deleteChore(choreId)
    refreshInstances()
  }

  const handleComplete = useCallback(async (choreId: number, date: string) => {
    setInstances(prev => prev.map(inst =>
      inst.chore_id === choreId && inst.occurrence_date === date
        ? { ...inst, completed: true, completed_at: new Date().toISOString() }
        : inst
    ))
    await api.completeChore(choreId, date)
  }, [])

  const handleUncomplete = useCallback(async (choreId: number, date: string) => {
    setInstances(prev => prev.map(inst =>
      inst.chore_id === choreId && inst.occurrence_date === date
        ? { ...inst, completed: false, completed_at: null }
        : inst
    ))
    await api.uncompleteChore(choreId, date)
  }, [])

  // Modal triggers
  const openAddChore = useCallback((date?: string) => {
    setModal({ type: 'chore', defaultDate: date })
  }, [])

  const openChoreFromCalendar = useCallback((instance: ChoreInstance) => {
    setModal({ type: 'completion', instance })
  }, [])

  const switchToEdit = useCallback(() => {
    if (modal.type === 'completion') {
      setModal({ type: 'chore', instance: modal.instance })
    }
  }, [modal])

  const darkMode = mode === 'dark'

  return (
    <div className={`flex h-screen overflow-hidden${darkMode ? ' dark-theme' : ''}`} style={{ background: darkMode ? '#0f172a' : '#f1f5f9' }}>
      {/* Main calendar area */}
      <CalendarView
        instances={filterAssigneeId === null ? instances : instances.filter(i => i.assignee_id === filterAssigneeId)}
        members={members}
        onEventClick={openChoreFromCalendar}
        onDateRangeChange={handleDateRangeChange}
        onAddChore={openAddChore}
        onComplete={handleComplete}
        onUncomplete={handleUncomplete}
        darkMode={darkMode}
        season={season}
        mode={mode}
        onThemeChange={setTheme}
      />

      {/* Team panel (right sidebar) */}
      <TeamPanel
        members={members}
        instances={instances}
        onAdd={handleAddMember}
        onRemove={handleRemoveMember}
        open={teamPanelOpen}
        onToggle={() => setTeamPanelOpen(p => !p)}
        filterAssigneeId={filterAssigneeId}
        onFilterChange={id => setFilterAssigneeId(prev => prev === id ? null : id)}
        darkMode={darkMode}
        season={season}
        onAnalyticsOpen={() => setAnalyticsOpen(true)}
      />

      {/* Modals */}
      {modal.type === 'chore' && (
        <ChoreModal
          instance={modal.instance}
          defaultDate={modal.defaultDate}
          members={members}
          onSave={handleSaveChore}
          onDelete={handleDeleteChore}
          onClose={() => setModal({ type: 'none' })}
          darkMode={darkMode}
        />
      )}
      {analyticsOpen && (
        <AnalyticsDashboard
          members={members}
          onClose={() => setAnalyticsOpen(false)}
          darkMode={darkMode}
        />
      )}
      {modal.type === 'completion' && (
        <CompletionModal
          instance={modal.instance}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onEdit={switchToEdit}
          onClose={() => setModal({ type: 'none' })}
          darkMode={darkMode}
          season={season}
        />
      )}
    </div>
  )
}
