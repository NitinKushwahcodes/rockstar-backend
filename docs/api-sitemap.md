# Roxstar Backend API Sitemap & Real-time Specification

## 1. REST API Catalog

Base URL: `/api/v1`

| Method | Endpoint | Auth | Description | Success Status | Error Statuses |
|--------|----------|------|-------------|----------------|----------------|
| `GET` | `/healthz` | None | Liveness probe | `200 OK` | `500` |
| `GET` | `/readyz` | None | Readiness probe (verifies MongoDB) | `200 OK` | `503 Service Unavailable` |
| `POST` | `/api/v1/users` | None | Create user session & return JWT | `201 Created` | `400 VALIDATION_FAILED` |
| `POST` | `/api/v1/rooms` | JWT | Create new room | `201 Created` | `400`, `401` |
| `GET` | `/api/v1/rooms/:roomId` | JWT | Get room state & active members | `200 OK` | `400`, `401`, `404 ROOM_NOT_FOUND` |
| `POST` | `/api/v1/rooms/:roomId/join` | JWT | Join room (idempotent) | `200 OK` | `400`, `401`, `404`, `422 TOO_MANY_PLAYERS` |
| `POST` | `/api/v1/rooms/:roomId/leave` | JWT | Leave room | `200 OK` | `400`, `401`, `404`, `400 NOT_A_MEMBER` |
| `POST` | `/api/v1/rooms/:roomId/spins` | JWT (Owner) | Trigger new spin elimination | `201 Created` | `400`, `401`, `403 NOT_ROOM_OWNER`, `409 SPIN_ALREADY_ACTIVE`, `422 INSUFFICIENT_PLAYERS` |
| `POST` | `/api/v1/rooms/:roomId/drafts` | JWT | Create or share draft payload | `201 Created` / `200 OK` | `400`, `401`, `404` |
| `GET` | `/api/v1/rooms/:roomId/drafts` | JWT | Fetch active draft for room | `200 OK` | `400`, `401`, `404 DRAFT_NOT_FOUND` |

---

## 2. Request & Response Payload Examples

### A. Create User (`POST /api/v1/users`)
**Request:**
```json
{
  "displayName": "Alex"
}
```
**Response (201 Created):**
```json
{
  "user": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "displayName": "Alex",
    "createdAt": "2026-09-18T19:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### B. Create Room (`POST /api/v1/rooms`)
**Request:**
```json
{
  "displayName": "Party Room"
}
```
**Response (201 Created):**
```json
{
  "room": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "code": "X7K2M9",
    "ownerId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "status": "ACTIVE",
    "members": [
      {
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "role": "OWNER",
        "status": "ACTIVE",
        "joinedAt": "2026-09-18T19:00:00.000Z"
      }
    ]
  }
}
```

---

## 3. Real-time Socket.IO Protocol

### Connection & Handshake
Clients connect to `/socket.io/` with auth token in query or auth payload:
```js
io("http://localhost:8080", {
  auth: { token: "<JWT_TOKEN>" },
  query: { roomId: "<ROOM_ID>" }
});
```

### Server -> Client Emitted Events

1. **`room_state`**
   Emitted on connection or member state change.
   ```json
   {
     "room": { ... },
     "spin": { ... }
   }
   ```

2. **`user_joined`**
   ```json
   {
     "roomId": "65f1a2b3c4d5e6f7a8b9c0d2",
     "userId": "65f1a2b3c4d5e6f7a8b9c0d3",
     "displayName": "Bob",
     "joinedAt": "2026-09-18T19:05:00.000Z"
   }
   ```

3. **`user_left`**
   ```json
   {
     "roomId": "65f1a2b3c4d5e6f7a8b9c0d2",
     "userId": "65f1a2b3c4d5e6f7a8b9c0d3",
     "leftAt": "2026-09-18T19:10:00.000Z"
   }
   ```

4. **`draft_shared`**
   ```json
   {
     "roomId": "65f1a2b3c4d5e6f7a8b9c0d2",
     "draft": {
       "id": "65f1a2b3c4d5e6f7a8b9c0d5",
       "name": "Cool Guitar Loop",
       "durationMs": 15000,
       "effect": "REVERB",
       "fileUrl": "https://example.com/loop.wav",
       "sharedById": "65f1a2b3c4d5e6f7a8b9c0d1"
     }
   }
   ```

5. **`spin_started`**
   ```json
   {
     "spinId": "65f1a2b3c4d5e6f7a8b9c0d4",
     "roomId": "65f1a2b3c4d5e6f7a8b9c0d2",
     "totalParticipants": 3,
     "startedAt": "2026-09-18T19:15:00.000Z"
   }
   ```

6. **`user_eliminated`**
   ```json
   {
     "spinId": "65f1a2b3c4d5e6f7a8b9c0d4",
     "step": 1,
     "eliminatedUser": {
       "id": "65f1a2b3c4d5e6f7a8b9c0d3",
       "displayName": "Bob"
     },
     "eliminationOrder": 1,
     "remainingActiveCount": 2
   }
   ```

7. **`winner_announced`**
   ```json
   {
     "spinId": "65f1a2b3c4d5e6f7a8b9c0d4",
     "winner": {
       "id": "65f1a2b3c4d5e6f7a8b9c0d1",
       "displayName": "Alex"
     },
     "completedAt": "2026-09-18T19:15:10.000Z"
   }
   ```
