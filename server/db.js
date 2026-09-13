import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  throw new Error('TURSO_DATABASE_URL is not set. Add it to .env (see .env.example).')
}

// This client (and the token it holds) only ever lives on the server.
const db = createClient({ url, authToken })

export async function migrate() {
  await db.batch(
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
  const { rows } = await db.execute({
    sql: `SELECT id, name, count, created_at, updated_at
          FROM awards WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    args: [userId],
  })
  return rows.map(toAward)
}

export async function createAward(userId, { name, count }) {
  const now = Date.now()
  const { rows } = await db.execute({
    sql: `INSERT INTO awards (user_id, name, count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, name, count, created_at, updated_at`,
    args: [userId, name, count, now, now],
  })
  return toAward(rows[0])
}

export async function updateAward(userId, id, { name, count }) {
  const { rows } = await db.execute({
    sql: `UPDATE awards SET name = ?, count = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
          RETURNING id, name, count, created_at, updated_at`,
    args: [name, count, Date.now(), id, userId],
  })
  return rows[0] ? toAward(rows[0]) : null
}

export async function deleteAward(userId, id) {
  const result = await db.execute({
    sql: 'DELETE FROM awards WHERE id = ? AND user_id = ?',
    args: [id, userId],
  })
  return result.rowsAffected > 0
}
