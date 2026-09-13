# Award Tracker

Track your awards: sign in with Google or email/password, add awards with a
count, edit or delete them, and see your totals per award type plus the average
gap between the awards you log.

- **Frontend:** Vite + React, Firebase Auth (Google + email/password)
- **Backend:** Express (`server/`) — the only thing that talks to the database
- **Database:** Turso (libSQL)

## How security works

1. The browser signs in with Firebase Auth and gets an ID token.
2. Every API call sends that token as `Authorization: Bearer <token>`.
3. The Express server verifies the token on every request (`server/auth.js`)
   and takes the user id from the verified token only.
4. Every SQL query filters on that user id (`WHERE user_id = ?`), so users can
   only ever see or change their own awards. Any user id the browser sends is ignored.
5. The Turso URL and token have no `VITE_` prefix, so Vite never includes them in
   the browser bundle. Only the server reads them.

## Setup

### 1. Firebase

In the [Firebase console](https://console.firebase.google.com/) for your project:

1. **Build → Authentication → Get started** (the API returns
   `CONFIGURATION_NOT_FOUND` until this has been done).
2. **Sign-in method** tab → enable **Email/Password** and **Google**.
3. **Settings → Authorized domains**: `localhost` is included by default. Add
   your production domain when you deploy.

### 2. Environment variables

Copy `.env.example` to `.env` and fill it in:

| Variable | Where it's used |
| --- | --- |
| `VITE_FIREBASE_*` | Firebase web config (public, bundled into the frontend) |
| `TURSO_DATABASE_URL` | Server only |
| `TURSO_AUTH_TOKEN` | Server only (secret) |
| `PORT` | Optional, Express port (default `3001`) |

`.env` is in `.gitignore`. Never commit it.

### 3. Run

```bash
npm install
npm run dev
```

This starts the Express API on port 3001 and the Vite dev server (it prints the
URL, usually http://localhost:5173). Vite forwards `/api` requests to Express.
The `awards` table is created automatically on first start.

### Production

```bash
npm run build
npm start
```

`npm start` runs Express, which serves both the API and the built app from `dist/`.
Use this on hosts that run a Node server (Render, Railway, a VPS).

### Deploying to Vercel

Vercel doesn't run `npm start`. It serves the built React app itself and runs
`api/index.js` as a serverless function; `vercel.json` sends every `/api/*`
request to it. The function uses the same Express app as local development
(`server/app.js`).

1. In **Vercel → Project → Settings → Environment Variables**, add all the
   variables from `.env`: the six `VITE_FIREBASE_*` ones **and**
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. If one is missing, the app shows
   "Server setup problem: … is not set on the server." After changing variables,
   redeploy; Vercel only applies them to new deployments.
2. In **Firebase → Authentication → Settings → Authorized domains**, add your
   Vercel domain (e.g. `your-app.vercel.app`).
3. Push to GitHub, or redeploy, so Vercel picks up the changes.

If `https://your-app.vercel.app/api/awards` returns `{"error":"Not signed in."}`,
the backend is running.

The server uses `@libsql/client/web`, Turso's pure-JavaScript client. Don't
change it to plain `@libsql/client`: that version loads a native SQLite binary
that Vercel leaves out of the function, which makes every `/api` request fail
with `FUNCTION_INVOCATION_FAILED`.

### "Cross-Origin-Opener-Policy policy would block the window.closed call"

Chrome shows this in the console when you click **Continue with Google**. It's a
warning, not an error. Google's sign-in page tells the browser to isolate itself
from the page that opened it. Firebase only uses `window.closed` to notice
whether you closed the popup, so sign-in still completes. There's no setting in
this app to change, and you can ignore it.

## API

All routes require a valid Firebase ID token.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/api/awards` | | Your awards, newest first |
| POST | `/api/awards` | `{ name, count }` | Created award |
| PUT | `/api/awards/:id` | `{ name, count }` | Updated award (404 if not yours) |
| DELETE | `/api/awards/:id` | | 204 (404 if not yours) |

`name`: 1–100 characters. `count`: whole number from 1 to 1,000,000.

## Notes

- **Saving:** the list on screen changes only after the server confirms a write,
  so what you see is what's stored. If a save fails, your typed input stays in
  place with an error so you can retry.
- **Totals by type:** entries whose names differ only by capitalization or
  spacing are counted as the same type.
- **Average gap between awards:** the average time between consecutive award
  entries, based on when each entry was first added (the time from the oldest
  to the newest entry, divided by the number of gaps). It needs at least two
  entries. Each entry counts once, whatever its count, and editing an entry
  doesn't change when it was logged.
