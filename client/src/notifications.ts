import type { ChoreInstance } from './api'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function scheduleNotificationsForToday(chores: ChoreInstance[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const today = new Date().toISOString().slice(0, 10)
  const dueToday = chores.filter(c => c.occurrence_date === today && !c.completed)

  if (dueToday.length > 0) {
    // Show immediate notification for chores due today
    new Notification('Office Chores Due Today', {
      body: dueToday.map(c => `• ${c.title}${c.assignee_name ? ` (${c.assignee_name})` : ''}`).join('\n'),
      icon: '/favicon.ico',
    })
  }

  // Schedule a reminder in 1 hour if there are pending chores
  const pendingNotDone = chores.filter(c => c.occurrence_date === today && !c.completed)
  if (pendingNotDone.length > 0) {
    const oneHour = 60 * 60 * 1000
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Reminder: Pending Chores', {
          body: `${pendingNotDone.length} chore(s) still pending for today`,
          icon: '/favicon.ico',
        })
      }
    }, oneHour)
  }
}
