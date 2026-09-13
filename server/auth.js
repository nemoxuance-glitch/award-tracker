import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Verifying Firebase ID tokens only needs the project id — the Admin SDK checks
// the token's signature against Google's public keys, so no service account
// key is required. The project id is public, so reusing the VITE_ value is fine.
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID

if (!projectId) {
  throw new Error('FIREBASE_PROJECT_ID (or VITE_FIREBASE_PROJECT_ID) is not set.')
}

const auth = getAuth(initializeApp({ projectId }))

// Express middleware: rejects the request unless it carries a valid Firebase
// ID token, then exposes the verified user id as req.userId.
export async function requireUser(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') ?? '')
  if (!match) {
    return res.status(401).json({ error: 'Not signed in.' })
  }

  try {
    const decoded = await auth.verifyIdToken(match[1])
    req.userId = decoded.uid
    next()
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
}
