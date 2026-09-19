# Manual Verification & Server Recovery Test Report

This document records the manual verification results and real server restart recovery test executed against the Roxstar real-time backend API.

---

## 1. Socket Event & Codebase Name Audit

| Item Checked | Expected State | Actual Result | Pass / Fail |
|--------------|----------------|---------------|-------------|
| Grep check for `member_joined` | 0 occurrences in `src/`, `tests/`, `docs/` | 0 occurrences found | **PASS** |
| Grep check for `member_left` | 0 occurrences in `src/`, `tests/`, `docs/` | 0 occurrences found | **PASS** |
| Grep check for `spin_tick` | 0 occurrences in `src/`, `tests/`, `docs/` | 0 occurrences found | **PASS** |
| Grep check for `spin_completed` | 0 occurrences in `src/`, `tests/`, `docs/` | 0 occurrences found | **PASS** |
| Grep check for `CANCELLED` | 0 occurrences in `src/`, `tests/`, `docs/` | 0 occurrences found (renamed to `ABORTED`) | **PASS** |
| Event bus check for `draft_shared` | Published on `POST /api/v1/rooms/:roomId/drafts` | `eventBus.emit(SocketEvents.DRAFT_SHARED, ...)` executed in `shareDraftToRoom` | **PASS** |

---

## 2. API & Real-time Flow Verification Table

| Step | What Was Tested | Expected Result | Actual Result / Response Snippet | Status |
|------|-----------------|-----------------|-----------------------------------|--------|
| **2a.1** | `GET /healthz` | `200 OK` with `{"status":"ok"}` | `HTTP 200` `{"status":"ok"}` | **PASS** |
| **2a.2** | `GET /readyz` | `200 OK` with `{"status":"ready","db":"up"}` | `HTTP 200` `{"status":"ready","db":"up"}` | **PASS** |
| **2b** | `POST /api/v1/users` (Users A, B, C) | `201 Created` with user object and JWT token | `HTTP 201` for A, B, C; JWT tokens issued for all 3 users | **PASS** |
| **2c** | `POST /api/v1/rooms` (Create room as A) | `201 Created`, ownerId = User A, participantCount = 1 | `HTTP 201`, Room `6aae3704319642262fdcc2b5`, ownerId = User A, count = 1 | **PASS** |
| **2d** | `POST /api/v1/rooms/:id/join` (Join as B & C) | `200 OK`, participantCount = 3 | `HTTP 200` for B, `HTTP 200` for C, participantCount = 3 | **PASS** |
| **2e** | Duplicate Join as B | `200 OK` (Idempotent), participantCount remains 3 | `HTTP 200`, `participantCount` remains 3 (no duplicate entry) | **PASS** |
| **2f** | Leave as C, then Rejoin as C | Leave `200 OK` (count=2), Rejoin `200 OK` (status flips back to `ACTIVE`, count=3) | Leave `HTTP 200`, Rejoin `HTTP 200`, User C status = `ACTIVE` | **PASS** |
| **2g** | Create Draft as A & Share to Room | Create `201 Created`, Share `200 OK` with `draft` object | Create `HTTP 201`, Share `HTTP 200`, `draft_shared` domain event published | **PASS** |
| **2h** | Try starting spin as non-owner (B) | `403 Forbidden` with code `NOT_ROOM_OWNER` | `HTTP 403` `{"error":{"code":"NOT_ROOM_OWNER","message":"Only the room owner can start a spin"}}` | **PASS** |
| **2i** | Leave as C (2 active members), start spin as A | `422 Unprocessable` with code `INSUFFICIENT_PLAYERS` & active count | `HTTP 422` `{"error":{"code":"INSUFFICIENT_PLAYERS","message":"Cannot start spin: room has 2 active players, minimum required is 3"}}` | **PASS** |
| **2j** | Rejoin C & start spin as owner (A) | `201 Created`, spin status `RUNNING`, participantCount = 3 | `HTTP 201`, Spin `6aae3707319642262fdcc304` status = `RUNNING` | **PASS** |
| **2k** | Immediate duplicate spin start as A | `409 Conflict` with code `SPIN_ALREADY_ACTIVE` | `HTTP 409` `{"error":{"code":"SPIN_ALREADY_ACTIVE","message":"An active spin is already running in this room"}}` | **PASS** |
| **2l** | Poll finished spin (`GET /api/v1/spins/:id`) | `200 OK`, status `COMPLETED`, non-null `winnerId` | `HTTP 200`, status `COMPLETED`, winnerId = `6aae3703319642262fdcc2af` | **PASS** |

---

## 3. Real Server Process Restart Edge Case Test

| Step | What Was Tested | Expected Result | Actual Result / Log Evidence | Status |
|------|-----------------|-----------------|------------------------------|--------|
| **3a** | Start spin with 3 fresh users (D, E, F) | `201 Created`, spin status `RUNNING` | Room `6aae376054c77f807e7f5a71`, Spin `6aae376154c77f807e7f5a90` `RUNNING` | **PASS** |
| **3b** | Wait 6s (1 elimination tick), kill server PID | 1st user eliminated (`eliminations.length = 1`), process terminated | Mid-spin status: `status=RUNNING, eliminations=1`. Process `PID 21912` killed via `SIGKILL` | **PASS** |
| **3c** | Spawn fresh server process (`node src/server.js`) | Server boots, connects to MongoDB Atlas, runs `recoverUnfinishedSpins` | **Log output:** `[SERVER 2 STDOUT] {"level":30,"time":1789802348679,"pid":25348,"recoveredCount":1,"msg":"Recovered unfinished spins on server boot"}` | **PASS** |
| **3d** | Wait for post-recovery spin completion | Spin continues scheduled ticks and reaches status `COMPLETED` with winner | `HTTP 200` `{"spin":{"id":"6aae376154c77f807e7f5a90","status":"COMPLETED","winnerId":"6aae376054c77f807e7f5a6f","eliminations":[...2 items...]}}` | **PASS** |

---

## 4. Final Summary

- **Automated Tests (`npm test`):** 22 / 22 PASS (0 failures).
- **Event Name Patch Verification:** 100% verified (no legacy event names remain).
- **Manual Verification Sequence:** 100% PASS (steps 2a through 2l).
- **Real Server Restart Recovery:** 100% PASS (step 3 recovery log verified).
