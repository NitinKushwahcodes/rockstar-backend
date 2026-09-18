# Roxstar Backend — Real-time Music Draft & Spin Elimination Engine

[![Node.js CI](https://img.shields.io/badge/Node.js-20%2B-brightgreen)](https://nodejs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-22%2F22%20PASS-success)](tests/)

Production-grade real-time backend service for music draft room management, live Socket.IO state synchronization, and a deterministic, database-enforced random participant spin elimination engine.

---

> [!IMPORTANT]
> **Scope & Track Notice:**
> This repository represents the **Backend track** of the Roxstar assessment. It provides the complete Node.js/Express REST API, Mongoose (MongoDB Atlas) persistence, Socket.IO real-time gateway, spin scheduler engine, automated test suite, and containerized deployment infrastructure.
> 
> *The Android native client application and audio synthesis track are explicitly out of scope for this backend assessment.*

---

## 🔑 Key Features & Technical Highlights

1. **Database-Enforced Single Active Spin Rule:**
   Uses a MongoDB **Partial Unique Index** (`{ roomId: 1 }, { status: { $in: ['WAITING', 'RUNNING'] } }`) on the `Spin` collection to guarantee at the database storage engine layer that a room can have at most 1 active spin at any given time, preventing race conditions or duplicate spin execution across distributed instances.

2. **MongoDB Atlas Multi-Document Transaction Retries:**
   Implements a robust `runWithTransactionRetry` wrapper that catches transient write conflicts (`WriteConflict` / code 112) and retries Mongoose sessions up to 3 times with exponential backoff.

3. **Chained-Timeout Spin Engine with Drift Correction:**
   Uses a recursive chained-timeout scheduler rather than fixed `setInterval` loops, calculating `delay = max(0, interval - elapsed)` per tick to prevent timer drift and tick overlap.

4. **Boot Recovery (`recoverUnfinishedSpins`):**
   Automatically detects and resumes any unfinished spins (`WAITING` or `RUNNING`) upon server startup or container restart.

5. **Security & SAIF Compliance:**
   Hardened with `helmet` security headers, IP rate-limiting (`express-rate-limit`), input validation with Zod, and sanitized production error responses.

6. **Automated Testing Suite:**
   100% automated test coverage using native `node:test` runner across 22 tests covering REST APIs, Socket.IO real-time presence, spin lifecycle, 7 core edge cases, and 1000-trial uniform selection randomness.

---

## 🛠️ Prerequisites & Setup

### Requirements
- **Node.js**: v20.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster or local replica set supporting multi-document transactions
- **Docker & Docker Compose** (Optional, for production containerized deployment)

### Local Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Rockstar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (see `.env.example` for reference):
   ```env
   PORT=8080
   NODE_ENV=development
   LOG_LEVEL=info
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/roxstar?retryWrites=true&w=majority
   JWT_SECRET=your_secure_256bit_jwt_secret_here
   SPIN_INTERVAL_MS=5000
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

---

## 🧪 Testing & Verification

Run the full automated test suite:
```bash
npm test
```

### Test Suite Structure (22 / 22 Tests Passing)
- `tests/health.test.js`: Health (`/healthz`) and Readiness (`/readyz`) probes.
- `tests/users.test.js`: User creation & JWT token issuance.
- `tests/rooms.test.js`: Room creation, joining (idempotent), leaving, and state endpoints.
- `tests/drafts.test.js`: Draft payload sharing and retrieval.
- `tests/realtime.test.js`: Socket.IO handshake auth, room presence, and disconnect notifications.
- `tests/spinLifecycle.test.js`: End-to-end happy path spin elimination (3 active players).
- `tests/spinEdgeCases.test.js`: 7 core edge cases (duplicate spin start, mid-spin leave, reconnection snapshot, owner disconnect, insufficient players, boot recovery, concurrent spin join).
- `tests/spinSelection.test.js`: Statistical test verifying uniform random participant selection across 1000 trials.

---

## 🐳 Production Deployment & AWS EC2 Setup

The project includes production-ready containerization files:
- `Dockerfile`: Multi-stage build running Node 20 Alpine under a non-root `nodejs` system user.
- `nginx/nginx.conf`: Nginx reverse proxy handling rate-limiting (30 r/s), security headers, REST API proxying (`/api/v1/`), and WebSocket upgrade handling (`/socket.io/`).
- `docker-compose.yml`: Multi-container orchestration linking `app` container and `nginx` container.

### Step 1: Deploying via Docker Compose

On your production server (e.g. AWS EC2 instance):
```bash
# Clone repository and copy environment variables
git clone <repository-url>
cd Rockstar
cp .env.example .env # Update with production MongoDB URI & JWT secret

# Launch containers
docker compose up -d --build
```

### Step 2: MongoDB Atlas IP Network Access Whitelisting

To restrict MongoDB Atlas database access securely:
1. Log into **MongoDB Atlas Console** -> **Network Access**.
2. Remove any global `0.0.0.0/0` IP whitelist entries.
3. Add the **Elastic IP / Public IPv4** of your deployment host (e.g. EC2 instance IP).

---

## 📁 Repository Sitemap & Project Structure

```
├── Dockerfile                   # Production multi-stage Docker build
├── docker-compose.yml           # App + Nginx docker compose configuration
├── package.json                 # Node.js dependencies and test scripts
├── nginx/
│   └── nginx.conf              # Nginx reverse proxy configuration
├── src/
│   ├── app.js                   # Express application setup & middleware
│   ├── server.js                # Server entry point & graceful shutdown
│   ├── config/                  # Database connection & env configuration
│   ├── lib/                     # Logger, AppError, & transaction helpers
│   ├── middleware/              # Auth, validation, rate limiter & error handlers
│   ├── models/                  # Mongoose models (User, Room, Draft, Spin)
│   └── modules/
│       ├── health/              # Health & readiness probes
│       ├── users/               # User registration & auth
│       ├── rooms/               # Room management
│       ├── drafts/              # Draft payload sharing
│       └── spins/               # Real-time spin engine & scheduler
├── tests/                       # Complete automated test suite (22 tests)
└── docs/
    ├── architecture.md          # Architecture diagrams & design details
    ├── api-sitemap.md           # Full REST & Socket.IO API specification
    └── edge-cases.md            # Edge case handling documentation
```
