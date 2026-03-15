import twilio from 'twilio'
import db from './db.js'
import { expandOccurrences } from './recurrence.js'

function getConfig() {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const dbConfig = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    sid:   dbConfig.twilio_sid    || process.env.TWILIO_ACCOUNT_SID,
    token: dbConfig.twilio_token  || process.env.TWILIO_AUTH_TOKEN,
    from:  dbConfig.twilio_from   || process.env.TWILIO_FROM,
    to:    dbConfig.manager_phone || process.env.MANAGER_PHONE,
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function sendSMS(body) {
  const { sid, token, from, to } = getConfig()
  if (!sid || !token) {
    console.warn('[SMS] Twilio not configured — skipping message')
    return
  }
  if (!to || !from) {
    console.warn('[SMS] MANAGER_PHONE or TWILIO_FROM not set — skipping message')
    return
  }
  const client = twilio(sid, token)
  try {
    await client.messages.create({ body, to, from })
    console.log('[SMS] Sent:', body.slice(0, 80))
  } catch (err) {
    console.error('[SMS] Failed to send:', err.message)
  }
}

// Exported for the test endpoint — throws on failure so the route can report the error
export async function sendSMSDirect(body) {
  const { sid, token, from, to } = getConfig()
  if (!sid || !token || !from || !to) {
    throw new Error('SMS not fully configured. Please save your credentials first.')
  }
  const client = twilio(sid, token)
  await client.messages.create({ body, to, from })
}

function getTodayInstances() {
  const date = today()
  const chores = db.prepare(`
    SELECT c.*, t.name as assignee_name
    FROM chores c
    LEFT JOIN team_members t ON c.assignee_id = t.id
  `).all()

  const completions = db.prepare(
    'SELECT chore_id FROM chore_completions WHERE occurrence_date = ?'
  ).all(date)
  const doneIds = new Set(completions.map(c => c.chore_id))

  const instances = []
  for (const chore of chores) {
    const dates = expandOccurrences(chore, date, date)
    if (dates.includes(date)) {
      instances.push({ ...chore, completed: doneIds.has(chore.id) })
    }
  }
  return instances
}

// ── Morning briefing ────────────────────────────────────────────────────────
export async function sendMorningBriefing() {
  const instances = getTodayInstances()
  if (instances.length === 0) return

  const list = instances
    .map(i => `${i.title}${i.assignee_name ? ` (${i.assignee_name})` : ''}`)
    .join(', ')

  await sendSMS(
    `Good morning! ${instances.length} chore${instances.length !== 1 ? 's' : ''} scheduled today: ${list}.`
  )
}

// ── Overdue alert ───────────────────────────────────────────────────────────
export async function sendOverdueAlert() {
  const overdue = getTodayInstances().filter(i => !i.completed)
  if (overdue.length === 0) return

  const list = overdue.map(i => i.title).join(', ')
  await sendSMS(
    `⚠️ ${overdue.length} chore${overdue.length !== 1 ? 's' : ''} weren't completed today: ${list}. Worth a follow-up.`
  )
}

// ── Weekly digest ───────────────────────────────────────────────────────────
export async function sendWeeklyDigest() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const start = monday.toISOString().slice(0, 10)
  const end = sunday.toISOString().slice(0, 10)

  const chores = db.prepare(`
    SELECT c.*, t.name as assignee_name
    FROM chores c
    LEFT JOIN team_members t ON c.assignee_id = t.id
  `).all()

  const completions = db.prepare(
    'SELECT chore_id, occurrence_date FROM chore_completions WHERE occurrence_date BETWEEN ? AND ?'
  ).all(start, end)
  const doneKeys = new Set(completions.map(c => `${c.chore_id}::${c.occurrence_date}`))

  let total = 0
  let done = 0
  const memberScores = {}

  for (const chore of chores) {
    for (const date of expandOccurrences(chore, start, end)) {
      total++
      if (doneKeys.has(`${chore.id}::${date}`)) {
        done++
        if (chore.assignee_name) {
          memberScores[chore.assignee_name] = (memberScores[chore.assignee_name] || 0) + 1
        }
      }
    }
  }

  if (total === 0) return

  const rate = Math.round((done / total) * 100)
  const topEntry = Object.entries(memberScores).sort((a, b) => b[1] - a[1])[0]
  const topPerformer = topEntry ? ` Top performer: ${topEntry[0]}.` : ''

  await sendSMS(`Weekly summary: ${done}/${total} chores completed (${rate}%).${topPerformer}`)
}

// ── All-done check (called after each completion) ───────────────────────────
let allDoneSentDate = null

export async function checkAndSendAllDone() {
  const date = today()
  if (allDoneSentDate === date) return // already sent today

  const instances = getTodayInstances()
  if (instances.length === 0) return

  if (instances.every(i => i.completed)) {
    allDoneSentDate = date
    await sendSMS('✅ All office chores are done for today. Great work team!')
  }
}
