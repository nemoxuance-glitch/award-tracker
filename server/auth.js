import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { requireEnv } from './config.js'

let auth

// Verifying Firebase ID tokens only needs the project id — the Admin SDK checks
// the token's signature against Google's public keys, so no service account
// key is required. The project id is public, so reusing the VITE_ value is fine.
// Created on first use so a missing variable becomes a clear error response.
function firebaseAuth() {
  auth ??= getAuth(
    initializeApp({ projectId: requireEnv('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID') }),
  )
  return auth
}

// Express middleware: rejects the request unless it carries a valid Firebase
// ID token, then exposes the verified user id as req.userId.
export async function requireUser(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') ?? '')
  if (!match) {
    return res.status(401).json({ error: 'Not signed in.' })
  }

  const verifier = firebaseAuth()
  try {
    const decoded = await verifier.verifyIdToken(match[1])
    req.userId = decoded.uid
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
  next()
}
