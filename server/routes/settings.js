import { Router } from 'express'
import db from '../db.js'
import { sendSMSDirect } from '../sms.js'

const router = Router()

// GET /api/settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const config = Object.fromEntries(rows.map(r => [r.key, r.value]))
  // Mask the auth token for display
  if (config.twilio_token) {
    config.twilio_token = config.twilio_token.slice(0, 4) + '••••••••••••••••••••••••••••'
  }
  res.json(config)
})

// POST /api/settings
router.post('/', (req, res) => {
  const { twilio_sid, twilio_token, twilio_from, manager_phone } = req.body
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

  const save = db.transaction(() => {
    if (twilio_sid)     upsert.run('twilio_sid',     twilio_sid)
    if (twilio_from)    upsert.run('twilio_from',    twilio_from)
    if (manager_phone)  upsert.run('manager_phone',  manager_phone)
    // Only update token if it doesn't look like the masked placeholder
    if (twilio_token && !twilio_token.includes('••')) {
      upsert.run('twilio_token', twilio_token)
    }
  })

  save()
  res.json({ success: true })
})

// POST /api/settings/test
router.post('/test', async (req, res) => {
  try {
    await sendSMSDirect('✅ Test message from your Office Chore App!')
    res.json({ success: true })
  } catch (err) {
    res.json({ success: false, error: err.message })
  }
})

export default router
