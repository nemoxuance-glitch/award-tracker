// Thrown when a required environment variable is missing. The error handler in
// app.js turns it into a readable JSON error instead of the whole server (or
// serverless function) crashing on startup with no explanation.
export class ConfigError extends Error {}

// Returns the value of the first of `names` that is set, or throws ConfigError.
export function requireEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name]
  }
  throw new ConfigError(`${names.join(' or ')} is not set on the server.`)
}
