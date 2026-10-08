# ABES GOES LATENT — Live Audience Tie-Breaker Voting

A small React/Vite + Node/Express application for live auditorium tie-breaker votes at ABES Engineering College. Audience members scan participant-specific QR codes and vote without accounts. Participant/event metadata and periodically flushed vote totals are stored in JSON files.

## Architecture

- **Frontend:** React/JSX, Vite, React Router, Tailwind CSS.
- **Backend:** one authoritative Express application in the root `server.js`, with routes in `backend/routes.js` and state/persistence in `backend/dataStore.js`.
- **Storage:** `backend/data/participants.json`, `backend/data/votes.json`, `backend/data/event.json` (or the optional `DATA_DIR` location).
- **Live tally:** Node.js in-memory counters are the source of truth while the process is running. A synchronous increment acknowledges a vote without filesystem I/O; dirty vote snapshots are atomically written about once per second, and on stop/reset/graceful shutdown.
- **Live display:** `/display` polls results about every 1.5 seconds. No database, WebSockets, audience login, or registration is used.

The old second implementation (`backend/server.js`) has been removed. Root `server.js` is used by both full-stack development and production, so API logic cannot silently diverge between two Express servers.

## Requirements and installation

Use Node.js 20.19+ (Node.js 22 LTS recommended) and npm.

```bash
npm install
cp .env.example .env
```

For production, set a strong `ADMIN_KEY` in the process environment or `.env`; production startup refuses to run without it. Never commit or expose that value. `.env` is ignored by Git. Optional settings are listed below.

## Local development

### One full-stack process

```bash
VITE_APP_URL=http://localhost:5000 npm run dev
```

Open <http://localhost:5000>. The root Express server hosts the Vite development middleware and API.

### Separate API and Vite processes

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

Open <http://localhost:5173>. Set `VITE_APP_URL=http://localhost:5173` for QR links; Vite proxies `/api` to `http://localhost:5000` by default. To proxy to another backend, set `VITE_DEV_API_TARGET` before starting Vite.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express listen port; defaults to `5000`. The server binds to `0.0.0.0`. |
| `ADMIN_KEY` | Organizer key for all administrative write routes. Required when `NODE_ENV=production`; optional in local development. Configure a long random value and keep it secret. |
| `CORS_ORIGIN` | Optional comma-separated allowlist of exact frontend origins when frontend/backend are hosted separately. If unset, CORS is permissive; configure it for production. |
| `VITE_APP_URL` | Frontend origin embedded in **all generated QR vote URLs**. Use `http://localhost:5173` locally and `https://<production-domain>` in production. |
| `VITE_API_URL` | Optional frontend API origin, e.g. `https://voting-api.example.com`; this is a public URL, not a secret. Leave unset when using same-origin or Vite proxy. |
| `VITE_DEV_API_TARGET` | Optional Vite development proxy target; defaults to `http://localhost:5000`. |
| `DATA_DIR` | Optional absolute or relative persistent data directory. Defaults to `backend/data`; useful for a mounted persistent volume or isolated test data. |
| `SERVE_FRONTEND` | Set to `false` to run the same root server as an API-only backend. |

The organizer enters `ADMIN_KEY` once on `/admin`; the browser keeps it in `sessionStorage` for that tab. Audience vote routes remain open. This key is a lightweight admin gate, not an account system; always use HTTPS in production.

## Build and start

Build the React app. Set frontend environment values at build time; `VITE_API_URL` may be omitted for same-origin deployment:

```bash
VITE_APP_URL=https://voting.example.com VITE_API_URL=https://api.example.com npm run build
```

Serve the built app and API together:

```bash
npm start
```

The production server serves static assets from `dist` and provides SPA fallback for direct visits to `/`, `/admin`, `/admin/qr`, `/display`, and `/vote/<participantId>`. If hosting the static frontend separately, configure the host to rewrite these routes to `index.html`.

To run only the API (for a separately hosted frontend):

```bash
npm run start:api
```

Set `VITE_APP_URL` at frontend build time to the deployed frontend origin so printed and projector QR codes point to the production app. Set `VITE_API_URL` to the public API origin when frontend and backend are separate. Configure backend `CORS_ORIGIN` to the exact deployed frontend origin (for example, `https://<production-domain>`). The API routes are under `/api`.

## Deployment architecture

Because JSON files need durable local writes, run the backend as a **persistent Node.js process on a persistent filesystem/volume** (for example, a small VPS or a persistent Node service with a mounted disk). Do **not** place the JSON-writing backend on an ephemeral/serverless filesystem and assume votes will persist. Keep exactly one active backend process per data directory; this implementation is in-process and does not coordinate writes across multiple backend replicas.

Recommended options:

1. **Simplest:** build the frontend and run `npm start` on one persistent Node host; use a persistent volume for `backend/data`.
2. **Separate frontend:** host the static `dist` directory and run the root Express app using `npm run start:api` on a persistent Node host. Configure `VITE_APP_URL`, `VITE_API_URL`, `CORS_ORIGIN`, `ADMIN_KEY`, and a persistent `DATA_DIR`.

Back up the JSON data files before the event. Monitor `/api/health`. Graceful `SIGTERM`/`SIGINT` shutdown flushes pending votes; a power loss or forced kill between periodic writes can lose up to roughly one second of votes. For an event-critical system, use a UPS and test the complete deployed network path before doors open.

## Prepare and run an event

1. Open `/admin` and enter the admin key if configured.
2. Add each participant with a unique ID (letters, digits, `-`, `_`; max 32 characters) and display name (max 80 characters). The participant list starts empty; no example participants are seeded.
3. Open **QR Codes** or `/admin/qr`, check the vote URL for the deployed domain, and print the large QR sheets. Each QR opens `/vote/<PARTICIPANT_ID>` directly.
4. Select only the participants taking part in this tie-breaker and click **SET TIE-BREAKER PARTICIPANTS**.
5. Open `/display` on the auditorium projector. It shows **WAITING FOR VOTING TO START** until the organizer starts voting.
6. Click **START VOTING** in Admin. Selected participants' counters reset to zero, a new voting session begins, and the projector shows the selected participants and scan-to-vote QR codes.
7. Audience members scan with their phone camera, open the participant page, and tap **CAST YOUR VOTE**. The browser locally discourages accidental repeat submissions within that session; it is not an identity or security control. The backend rejects votes unless status is `LIVE` and the participant is selected.
8. The organizer clicks **STOP VOTING** to close voting and flush the final tally. New votes are rejected; `/display` shows final results, leader or tie, vote counts, and percentages.
9. Use **RESET VOTES** to clear all counts and return the event to `WAITING` before another tie-breaker.

Participant configuration and tie-breaker selection are locked while voting is LIVE. Stop voting before editing participants.

## API routes

- `GET /api/health`
- `GET /api/participants`, `GET /api/participants/:id`
- `POST /api/admin/participants`, `PUT /api/admin/participants/:id`, `DELETE /api/admin/participants/:id`
- `GET /api/admin/tie-breaker`, `POST /api/admin/tie-breaker`
- `GET /api/status`, `GET /api/results`
- `POST /api/vote/:participantId`
- `POST /api/admin/start`, `POST /api/admin/stop`, `POST /api/admin/reset`

All admin write requests require `x-admin-key` when `ADMIN_KEY` is set. Audience vote requests do not.

## Load test

Run:

```bash
npm run load-test
```

This starts an isolated temporary API process with temporary JSON files, adds P01–P03, and tests (1) 500 concurrent requests for P01, expecting exactly 500 votes, and (2) 500 concurrent requests distributed across P01–P03, expecting exactly 500 successful votes and persisted totals. It does not modify the event's normal `backend/data` files. Run it locally before deployment; it is not included in the frontend bundle.
# AGL
