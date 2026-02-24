export interface TeamMember {
  id: number
  name: string
  created_at: string
}

export interface Chore {
  id: number
  title: string
  description: string | null
  assignee_id: number | null
  start_date: string
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'monthly_weekday' | 'custom'
  recurrence_days: string | null
  recurrence_interval: number | null
  recurrence_end_date: string | null
  is_incentive: boolean
  recurrence_weekday: number | null
  recurrence_week: number | null
  created_at: string
}

export interface ChoreInstance {
  id: string
  chore_id: number
  title: string
  description: string | null
  assignee_id: number | null
  assignee_name: string | null
  occurrence_date: string
  recurrence_type: string
  is_incentive: boolean
  completed: boolean
  completed_at: string | null
}

export interface CreateChorePayload {
  title: string
  description?: string
  assignee_id?: number | null
  start_date: string
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'monthly_weekday' | 'custom'
  recurrence_days?: number[]
  recurrence_interval?: number
  recurrence_end_date?: string
  is_incentive?: boolean
  recurrence_weekday?: number
  recurrence_week?: number
}

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Team
  getTeam: () => request<TeamMember[]>('/team'),
  addMember: (name: string) =>
    request<TeamMember>('/team', { method: 'POST', body: JSON.stringify({ name }) }),
  removeMember: (id: number) =>
    request<{ success: boolean }>(`/team/${id}`, { method: 'DELETE' }),

  // Chores
  getChores: (start: string, end: string) =>
    request<ChoreInstance[]>(`/chores?start=${start}&end=${end}`),
  createChore: (payload: CreateChorePayload) =>
    request<Chore>('/chores', { method: 'POST', body: JSON.stringify(payload) }),
  updateChore: (id: number, payload: Partial<CreateChorePayload>) =>
    request<Chore>(`/chores/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteChore: (id: number) =>
    request<{ success: boolean }>(`/chores/${id}`, { method: 'DELETE' }),
  completeChore: (choreId: number, occurrence_date: string) =>
    request<{ success: boolean }>(`/chores/${choreId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ occurrence_date }),
    }),
  uncompleteChore: (choreId: number, occurrence_date: string) =>
    request<{ success: boolean }>(`/chores/${choreId}/complete`, {
      method: 'DELETE',
      body: JSON.stringify({ occurrence_date }),
    }),
}
