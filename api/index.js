// Vercel serverless function: every /api/* request is rewritten here (see
// vercel.json) and handled by the same Express app used locally. Vercel serves
// the built React app itself, so no static folder is passed.
import { createApp } from '../server/app.js'

export default createApp()
