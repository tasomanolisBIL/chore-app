import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import choreRoutes from './routes/chores.js'
import teamRoutes from './routes/team.js'
import settingsRoutes from './routes/settings.js'
import { initScheduler } from './scheduler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// API routes
app.use('/api/chores', choreRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/settings', settingsRoutes)

// Serve built client in production
if (isProd) {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  initScheduler()
})
