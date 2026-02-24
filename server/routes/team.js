import { Router } from 'express'
import db from '../db.js'

const router = Router()

// GET /api/team
router.get('/', (req, res) => {
  const members = db.prepare('SELECT * FROM team_members ORDER BY name').all()
  res.json(members)
})

// POST /api/team
router.post('/', (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }
  const result = db.prepare('INSERT INTO team_members (name) VALUES (?)').run(name.trim())
  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(member)
})

// DELETE /api/team/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params
  // foreign key ON DELETE SET NULL will handle chore assignee cleanup
  const result = db.prepare('DELETE FROM team_members WHERE id = ?').run(id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Member not found' })
  }
  res.json({ success: true })
})

export default router
