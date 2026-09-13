import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import AwardsPage from './AwardsPage.jsx'
import { auth } from './firebase'
import LoginPage from './LoginPage.jsx'

export default function App() {
  // undefined = still checking for an existing session, null = signed out
  const [user, setUser] = useState(undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) {
    return (
      <div className="splash" role="status">
        <span className="spinner" aria-hidden="true" />
        Loading…
      </div>
    )
  }

  // Keying by uid guarantees no state carries over between accounts.
  return user ? <AwardsPage key={user.uid} user={user} /> : <LoginPage />
}
