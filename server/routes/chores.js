import { Router } from 'express'
import db from '../db.js'
import { expandOccurrences } from '../recurrence.js'

const router = Router()

// GET /api/chores?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', (req, res) => {
  const { start, end } = req.query
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params required' })
  }

  const chores = db.prepare(`
    SELECT c.*, t.name as assignee_name
    FROM chores c
    LEFT JOIN team_members t ON c.assignee_id = t.id
  `).all()

  const completions = db.prepare(`
    SELECT chore_id, occurrence_date, completed_at
    FROM chore_completions
    WHERE occurrence_date BETWEEN ? AND ?
  `).all(start, end)

  const completionMap = new Map()
  for (const comp of completions) {
    const key = `${comp.chore_id}::${comp.occurrence_date}`
    completionMap.set(key, comp)
  }

  const instances = []
  for (const chore of chores) {
    const dates = expandOccurrences(chore, start, end)
    for (const date of dates) {
      const key = `${chore.id}::${date}`
      const completion = completionMap.get(key) || null
      instances.push({
        id: `${chore.id}-${date}`,
        chore_id: chore.id,
        title: chore.title,
        description: chore.description,
        assignee_id: chore.assignee_id,
        assignee_name: chore.assignee_name,
        occurrence_date: date,
        recurrence_type: chore.recurrence_type,
        is_incentive: !!chore.is_incentive,
        completed: !!completion,
        completed_at: completion?.completed_at || null,
      })
    }
  }

  res.json(instances)
})

// POST /api/chores
router.post('/', (req, res) => {
  const {
    title,
    description,
    assignee_id,
    start_date,
    recurrence_type = 'none',
    recurrence_days,
    recurrence_interval,
    recurrence_end_date,
    is_incentive = false,
    recurrence_weekday,
    recurrence_week,
  } = req.body

  if (!title || !start_date) {
    return res.status(400).json({ error: 'title and start_date are required' })
  }

  const result = db.prepare(`
    INSERT INTO chores (title, description, assignee_id, start_date, recurrence_type,
      recurrence_days, recurrence_interval, recurrence_end_date,
      is_incentive, recurrence_weekday, recurrence_week)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || null,
    assignee_id || null,
    start_date,
    recurrence_type,
    recurrence_days ? JSON.stringify(recurrence_days) : null,
    recurrence_interval || null,
    recurrence_end_date || null,
    is_incentive ? 1 : 0,
    recurrence_weekday ?? null,
    recurrence_week ?? null,
  )

  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(chore)
})

// PUT /api/chores/:id
router.put('/:id', (req, res) => {
  const { id } = req.params
  const {
    title,
    description,
    assignee_id,
    start_date,
    recurrence_type,
    recurrence_days,
    recurrence_interval,
    recurrence_end_date,
    is_incentive,
    recurrence_weekday,
    recurrence_week,
  } = req.body

  const existing = db.prepare('SELECT * FROM chores WHERE id = ?').get(id)
  if (!existing) {
    return res.status(404).json({ error: 'Chore not found' })
  }

  db.prepare(`
    UPDATE chores
    SET title = ?, description = ?, assignee_id = ?, start_date = ?,
        recurrence_type = ?, recurrence_days = ?, recurrence_interval = ?,
        recurrence_end_date = ?, is_incentive = ?, recurrence_weekday = ?, recurrence_week = ?
    WHERE id = ?
  `).run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    assignee_id !== undefined ? (assignee_id || null) : existing.assignee_id,
    start_date ?? existing.start_date,
    recurrence_type ?? existing.recurrence_type,
    recurrence_days !== undefined ? (recurrence_days ? JSON.stringify(recurrence_days) : null) : existing.recurrence_days,
    recurrence_interval !== undefined ? (recurrence_interval || null) : existing.recurrence_interval,
    recurrence_end_date !== undefined ? (recurrence_end_date || null) : existing.recurrence_end_date,
    is_incentive !== undefined ? (is_incentive ? 1 : 0) : existing.is_incentive,
    recurrence_weekday !== undefined ? (recurrence_weekday ?? null) : existing.recurrence_weekday,
    recurrence_week !== undefined ? (recurrence_week ?? null) : existing.recurrence_week,
    id,
  )

  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(id)
  res.json(chore)
})

// DELETE /api/chores/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params
  const result = db.prepare('DELETE FROM chores WHERE id = ?').run(id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Chore not found' })
  }
  res.json({ success: true })
})

// POST /api/chores/:id/complete
router.post('/:id/complete', (req, res) => {
  const { id } = req.params
  const { occurrence_date } = req.body

  if (!occurrence_date) {
    return res.status(400).json({ error: 'occurrence_date is required' })
  }

  const chore = db.prepare('SELECT id FROM chores WHERE id = ?').get(id)
  if (!chore) {
    return res.status(404).json({ error: 'Chore not found' })
  }

  try {
    db.prepare(`
      INSERT INTO chore_completions (chore_id, occurrence_date) VALUES (?, ?)
    `).run(id, occurrence_date)
    res.status(201).json({ success: true })
  } catch (err) {
    res.status(409).json({ error: 'Already completed' })
  }
})

// DELETE /api/chores/:id/complete
router.delete('/:id/complete', (req, res) => {
  const { id } = req.params
  const { occurrence_date } = req.body

  if (!occurrence_date) {
    return res.status(400).json({ error: 'occurrence_date is required' })
  }

  const result = db.prepare(`
    DELETE FROM chore_completions WHERE chore_id = ? AND occurrence_date = ?
  `).run(id, occurrence_date)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Completion not found' })
  }
  res.json({ success: true })
})

export default router
