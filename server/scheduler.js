import cron from 'node-cron'
import { sendMorningBriefing, sendOverdueAlert, sendWeeklyDigest } from './sms.js'

export function initScheduler() {
  // 9am daily — morning briefing
  cron.schedule('0 9 * * *', () => {
    sendMorningBriefing().catch(err => console.error('[Scheduler] Morning briefing error:', err))
  })

  // 8pm daily — overdue alert
  cron.schedule('0 20 * * *', () => {
    sendOverdueAlert().catch(err => console.error('[Scheduler] Overdue alert error:', err))
  })

  // Friday 6pm — weekly digest
  cron.schedule('0 18 * * 5', () => {
    sendWeeklyDigest().catch(err => console.error('[Scheduler] Weekly digest error:', err))
  })

  console.log('[Scheduler] SMS notifications scheduled (9am briefing, 8pm overdue, Fri 6pm digest)')
}
