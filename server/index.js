import express from 'express'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { requireUser } from './auth.js'
import { createAward, deleteAward, listAwards, migrate, updateAward } from './db.js'

const MAX_NAME_LENGTH = 100
const MAX_COUNT = 1_000_000

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))

// Everything under /api requires a verified login. The user id used by every
// handler comes from the token (req.userId), never from the browser's input.
const api = express.Router()
api.use(requireUser)

// Returns { name, count } or an error message string.
function parseAward(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const count = body?.count

  if (!name) return 'Award name is required.'
  if (name.length > MAX_NAME_LENGTH) return `Award name must be ${MAX_NAME_LENGTH} characters or fewer.`
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return `Number of awards must be a whole number from 1 to ${MAX_COUNT.toLocaleString('en-US')}.`
  }
  return { name, count }
}

function parseId(raw) {
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

api.get('/awards', async (req, res) => {
  res.json(await listAwards(req.userId))
})

api.post('/awards', async (req, res) => {
  const award = parseAward(req.body)
  if (typeof award === 'string') return res.status(400).json({ error: award })
  res.status(201).json(await createAward(req.userId, award))
})

api.put('/awards/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const award = parseAward(req.body)
  if (!id) return res.status(404).json({ error: 'Award not found.' })
  if (typeof award === 'string') return res.status(400).json({ error: award })

  const updated = await updateAward(req.userId, id, award)
  if (!updated) return res.status(404).json({ error: 'Award not found.' })
  res.json(updated)
})

api.delete('/awards/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (!id || !(await deleteAward(req.userId, id))) {
    return res.status(404).json({ error: 'Award not found.' })
  }
  res.status(204).end()
})

app.use('/api', api)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

// In production, serve the built React app from the same origin.
const distDir = fileURLToPath(new URL('../dist', import.meta.url))
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('/{*splat}', (req, res) => res.sendFile('index.html', { root: distDir }))
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed or oversized JSON bodies from express.json()
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'Invalid request.' })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' })
})

const port = Number(process.env.PORT) || 3001
await migrate()
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
