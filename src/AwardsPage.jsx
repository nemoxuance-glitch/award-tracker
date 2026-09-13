import { signOut } from 'firebase/auth'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createAward, deleteAward, listAwards, updateAward } from './api'
import AwardRow from './AwardRow.jsx'
import {
  averageGapMs,
  formatDuration,
  MAX_COUNT,
  MAX_NAME_LENGTH,
  totalsByType,
  validateAward,
} from './awards'
import { auth } from './firebase'

export default function AwardsPage({ user }) {
  const [awards, setAwards] = useState(null) // null while loading
  const [loadError, setLoadError] = useState('')
  const [pendingSaves, setPendingSaves] = useState(0)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let current = true
    listAwards().then(
      (list) => current && setAwards(list),
      (err) => current && setLoadError(err.message),
    )
    return () => {
      current = false
    }
  }, [loadAttempt])

  function retryLoad() {
    setLoadError('')
    setLoadAttempt((n) => n + 1)
  }

  // Warn before closing the tab while a change is still being written.
  useEffect(() => {
    if (pendingSaves === 0) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pendingSaves])

  // The list only changes after the server confirms the write, so what's on
  // screen is always what's stored in the database.
  async function trackSave(request) {
    setPendingSaves((n) => n + 1)
    try {
      return await request
    } finally {
      setPendingSaves((n) => n - 1)
    }
  }

  async function handleCreate(award) {
    const created = await trackSave(createAward(award))
    setAwards((list) => [created, ...list])
  }

  async function handleUpdate(id, award) {
    const updated = await trackSave(updateAward(id, award))
    setAwards((list) => list.map((a) => (a.id === id ? updated : a)))
  }

  async function handleDelete(id) {
    await trackSave(deleteAward(id))
    setAwards((list) => list.filter((a) => a.id !== id))
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🏆</span>
          <span className="brand-name">Award Tracker</span>
        </div>
        <div className="topbar-right">
          {awards && (
            <span className={`save-status ${pendingSaves ? 'is-saving' : ''}`} role="status">
              {pendingSaves ? 'Saving…' : '✓ All changes saved'}
            </span>
          )}
          <span className="user-email" title={user.email ?? ''}>
            {user.displayName || user.email}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => signOut(auth)}
            disabled={pendingSaves > 0}
            title={pendingSaves ? 'Waiting for changes to save…' : undefined}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="content">
        {loadError ? (
          <div className="card">
            <p className="alert alert-error" role="alert">Couldn’t load your awards: {loadError}</p>
            <button type="button" className="btn btn-primary" onClick={retryLoad}>
              Try again
            </button>
          </div>
        ) : awards === null ? (
          <div className="splash" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading your awards…
          </div>
        ) : (
          <>
            <Summary awards={awards} />
            <AddAwardForm onCreate={handleCreate} />
            <section className="card">
              <h2>Your awards</h2>
              {awards.length === 0 ? (
                <p className="empty">No awards yet. Add your first one above.</p>
              ) : (
                <ul className="award-list">
                  {awards.map((award) => (
                    <AwardRow
                      key={award.id}
                      award={award}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function Summary({ awards }) {
  const types = useMemo(() => totalsByType(awards), [awards])
  const total = types.reduce((sum, t) => sum + t.count, 0)
  const avgGap = useMemo(() => averageGapMs(awards), [awards])

  return (
    <section className="card summary" aria-label="Summary">
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Total awards</span>
          <span className="stat-value">{total.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Award types</span>
          <span className="stat-value">{types.length.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Average gap between awards</span>
          <span className="stat-value">{avgGap === null ? '—' : formatDuration(avgGap)}</span>
          <span className="stat-hint">
            {avgGap === null
              ? 'Log at least two awards to see this'
              : `Across ${awards.length} entries, by date logged`}
          </span>
        </div>
      </div>

      {types.length > 0 && (
        <div className="breakdown">
          <h2>Totals by type</h2>
          <ul>
            {types.map((t) => (
              <li key={t.name.toLowerCase()}>
                <span className="breakdown-name">{t.name}</span>
                <span className="breakdown-count">{t.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function AddAwardForm({ onCreate }) {
  const [name, setName] = useState('')
  const [count, setCount] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const { award, error: invalid } = validateAward(name, count)
    if (invalid) return setError(invalid)

    setSaving(true)
    setError('')
    try {
      await onCreate(award)
      setName('')
      setCount('1')
      nameRef.current?.focus()
    } catch (err) {
      // Keep what the user typed so nothing is lost; they can retry.
      setError(`Not saved: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <h2>Add an award</h2>
      <form className="add-form" onSubmit={handleSubmit} noValidate>
        <label className="field grow">
          <span>Award name</span>
          <input
            ref={nameRef}
            type="text"
            placeholder="e.g. Science Fair Gold Medal"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field count-field">
          <span>How many</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_COUNT}
            step={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add award'}
        </button>
      </form>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
    </section>
  )
}
