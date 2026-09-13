import { useState } from 'react'
import { formatDateTime, MAX_COUNT, MAX_NAME_LENGTH, validateAward } from './awards'

export default function AwardRow({ award, onUpdate, onDelete }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirm-delete'
  const [name, setName] = useState(award.name)
  const [count, setCount] = useState(String(award.count))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function startEdit() {
    setName(award.name)
    setCount(String(award.count))
    setError('')
    setMode('edit')
  }

  function cancel() {
    setError('')
    setMode('view')
  }

  async function handleSave(e) {
    e.preventDefault()
    const { award: next, error: invalid } = validateAward(name, count)
    if (invalid) return setError(invalid)
    if (next.name === award.name && next.count === award.count) return cancel()

    setBusy(true)
    setError('')
    try {
      await onUpdate(award.id, next)
      setMode('view')
    } catch (err) {
      // Stay in edit mode with the user's changes so they can retry.
      setError(`Not saved: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError('')
    try {
      await onDelete(award.id) // on success this row is removed from the list
    } catch (err) {
      setError(`Not deleted: ${err.message}`)
      setBusy(false)
    }
  }

  if (mode === 'edit') {
    return (
      <li className="award-row is-editing">
        <form
          className="edit-form"
          onSubmit={handleSave}
          onKeyDown={(e) => e.key === 'Escape' && !busy && cancel()}
          noValidate
        >
          <label className="field grow">
            <span>Award name</span>
            <input
              type="text"
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
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
          <div className="row-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </li>
    )
  }

  const edited = award.updatedAt !== award.createdAt

  return (
    <li className="award-row">
      <div className="award-main">
        <div className="award-title">
          <span className="award-name">{award.name}</span>
          <span className="award-count" aria-label={`${award.count} awards`}>
            ×{award.count.toLocaleString()}
          </span>
        </div>
        <div className="award-meta">
          Logged {formatDateTime(award.createdAt)}
          {edited && <> · Edited {formatDateTime(award.updatedAt)}</>}
        </div>
      </div>

      {mode === 'confirm-delete' ? (
        <div className="row-actions confirm">
          <span>Delete this award?</span>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>
            Keep
          </button>
        </div>
      ) : (
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={startEdit} aria-label={`Edit ${award.name}`}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-ghost-danger"
            onClick={() => setMode('confirm-delete')}
            aria-label={`Delete ${award.name}`}
          >
            Delete
          </button>
        </div>
      )}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
    </li>
  )
}
