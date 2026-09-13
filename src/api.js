import { auth } from './firebase'

// Sends a request to the Express API with the signed-in user's Firebase ID
// token. The server works out who the user is from this token alone.
async function request(path, { method = 'GET', body } = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('You are signed out. Please sign in again.')

  // getIdToken() returns a cached token and refreshes it when it's close to expiring.
  const token = await user.getIdToken()

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`)
  return data
}

export const listAwards = () => request('/awards')
export const createAward = (award) => request('/awards', { method: 'POST', body: award })
export const updateAward = (id, award) => request(`/awards/${id}`, { method: 'PUT', body: award })
export const deleteAward = (id) => request(`/awards/${id}`, { method: 'DELETE' })
