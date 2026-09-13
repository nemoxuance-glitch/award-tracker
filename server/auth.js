import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import { requireEnv } from './config.js'

// Verifies Firebase ID tokens with the `jose` library, following
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
// (We don't use firebase-admin: its dependency jwks-rsa require()s the ESM-only
// jose package, which crashes on Vercel's Node runtime.)

// Google's public signing keys for Firebase ID tokens, in JWK format.
const FIREBASE_KEYS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

// Allowance for small clock differences between Google and this server.
const CLOCK_SKEW_SECONDS = 30

class InvalidTokenError extends Error {}

// Returns an async function that resolves to the user's uid if `token` is a
// valid Firebase ID token for `projectId`, and throws otherwise. `keys` is a
// jose key set (a remote one in production, a local one in tests).
export function createTokenVerifier({ projectId, keys }) {
  return async function verifyToken(token) {
    // Checks the RS256 signature against Google's key matching the token's
    // `kid`, plus expiry, issuer and audience.
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: CLOCK_SKEW_SECONDS,
      requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
    })

    const latest = Date.now() / 1000 + CLOCK_SKEW_SECONDS
    if (typeof payload.iat !== 'number' || payload.iat > latest) {
      throw new InvalidTokenError('Token issued in the future.')
    }
    if (typeof payload.auth_time !== 'number' || payload.auth_time > latest) {
      throw new InvalidTokenError('Token auth_time is in the future.')
    }
    if (typeof payload.sub !== 'string' || payload.sub === '' || payload.sub.length > 128) {
      throw new InvalidTokenError('Token has an invalid subject.')
    }
    return payload.sub // the Firebase user id (uid)
  }
}

let verifyToken

// Created on first use so a missing variable becomes a clear error response.
// The project id is public, so reusing the VITE_ value is fine.
function tokenVerifier() {
  verifyToken ??= createTokenVerifier({
    projectId: requireEnv('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'),
    keys: createRemoteJWKSet(new URL(FIREBASE_KEYS_URL)), // fetched and cached by jose
  })
  return verifyToken
}

// jose errors caused by this server failing to fetch Google's keys, rather
// than by a bad token.
const KEY_FETCH_ERRORS = new Set(['ERR_JWKS_TIMEOUT', 'ERR_JWKS_INVALID'])

function isBadTokenError(err) {
  if (err instanceof InvalidTokenError) return true
  return err instanceof errors.JOSEError && !KEY_FETCH_ERRORS.has(err.code)
}

// Express middleware: rejects the request unless it carries a valid Firebase
// ID token, then exposes the verified user id as req.userId.
export async function requireUser(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('Authorization') ?? '')
  if (!match) {
    return res.status(401).json({ error: 'Not signed in.' })
  }

  const verify = tokenVerifier()
  try {
    req.userId = await verify(match[1])
  } catch (err) {
    if (isBadTokenError(err)) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    }
    console.error('Could not verify sign-in token:', err)
    return res.status(503).json({ error: 'Couldn’t check your sign-in right now. Please try again.' })
  }
  next()
}
