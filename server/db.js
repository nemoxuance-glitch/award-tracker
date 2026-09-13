// The "web" build talks to Turso over HTTP in plain JavaScript. The default
// build also loads a native SQLite binary (for local database files), which
// Vercel's bundler leaves out, crashing the serverless function on load.
import { createClient } from '@libsql/client/web'
import { requireEnv } from './config.js'

let client

// Created on first use, so a missing variable becomes a clear error response
// rather than a crash at startup. The client and its token only ever live on
// the server.
function db() {
  client ??= createClient({
    url: requireEnv('TURSO_DATABASE_URL'),
    authToken: requireEnv('TURSO_AUTH_TOKEN'),
  })
  return client
}

let schemaReady

// Creates the table if needed. Runs at most once per server instance (a
// serverless function has no startup step, so this is called per request and
// only does real work the first time). A failure is retried on the next call.
export function ensureSchema() {
  schemaReady ??= migrate().catch((err) => {
    schemaReady = undefined
    throw err
  })
  return schemaReady
}

async function migrate() {
  await db().batch(
    [
      `CREATE TABLE IF NOT EXISTS awards (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT    NOT NULL,
        name       TEXT    NOT NULL,
        count      INTEGER NOT NULL CHECK (count >= 1),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS idx_awards_user ON awards (user_id, created_at)',
    ],
    'write',
  )
}

function toAward(row) {
  return {
    id: Number(row.id),
    name: row.name,
    count: Number(row.count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

// Every query below takes the user id from the verified login token (never
// from the request body or URL) and includes it in the WHERE clause, so one
// user can never read or change another user's awards.

export async function listAwards(userId) {
  const { rows } = await db().execute({
    sql: `SELECT id, name, count, created_at, updated_at
          FROM awards WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    args: [userId],
  })
  return rows.map(toAward)
}

export async function createAward(userId, { name, count }) {
  const now = Date.now()
  const { rows } = await db().execute({
    sql: `INSERT INTO awards (user_id, name, count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, name, count, created_at, updated_at`,
    args: [userId, name, count, now, now],
  })
  return toAward(rows[0])
}

export async function updateAward(userId, id, { name, count }) {
  const { rows } = await db().execute({
    sql: `UPDATE awards SET name = ?, count = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
          RETURNING id, name, count, created_at, updated_at`,
    args: [name, count, Date.now(), id, userId],
  })
  return rows[0] ? toAward(rows[0]) : null
}

export async function deleteAward(userId, id) {
  const result = await db().execute({
    sql: 'DELETE FROM awards WHERE id = ? AND user_id = ?',
    args: [id, userId],
  })
  return result.rowsAffected > 0
}
