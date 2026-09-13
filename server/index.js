// Runs the app as a normal Node server: `npm run dev` locally, or `npm start`
// on hosts like Render or Railway. (On Vercel, api/index.js is used instead.)
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { ensureSchema } from './db.js'

// After `npm run build`, serve the React app from the same origin as the API.
const distDir = fileURLToPath(new URL('../dist', import.meta.url))
const app = createApp({ staticDir: existsSync(distDir) ? distDir : undefined })

const port = Number(process.env.PORT) || 3001
await ensureSchema()
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
