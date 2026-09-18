# Edge Case Reasoning & Coverage Log

| # | Edge Case | Trigger | Chosen Behaviour | Implementation Location | Test Coverage |
|---|---|---|---|---|---|
| 1 | Duplicate spin start while RUNNING | `POST /rooms/:roomId/spins` called when a spin is active | Returns `409 SPIN_ALREADY_ACTIVE`; enforced by database partial unique index | `Spin.js` partial index, `spin.service.js` | `spinEdgeCases.test.js` |
| 2 | Participant leaves mid-spin | HTTP `POST /rooms/:roomId/leave` during an active spin | User is eliminated immediately with next order; elimination timer continues | `spin.service.js` (`handleParticipantLeft`) | `spinEdgeCases.test.js` |
| 3 | Client reconnects mid-spin | Socket disconnect and reconnect during active spin | Server sends fresh `room_state` event containing active spin snapshot | `gateway.js` (`connection` handler) | `spinEdgeCases.test.js` |
| 4 | Room owner disconnects mid-spin | Room owner drops socket or leaves room while spin is RUNNING | Server timer is authoritative; spin continues running to completion | `spin.service.js`, `spin.scheduler.js` | `spinEdgeCases.test.js` |
| 5 | Fewer than 3 eligible players | `POST /rooms/:roomId/spins` when active member count < 3 | Returns `422 INSUFFICIENT_PLAYERS` with actual player count in error message | `spin.service.js` (`startSpin`) | `spinEdgeCases.test.js` |
| 6 | Server restarts mid-spin | Process crash, SIGTERM, or server reboot during RUNNING spin | `recoverUnfinishedSpins()` queries active spins on boot and reschedules timers | `spin.scheduler.js` (`recoverUnfinishedSpins`) | `spinEdgeCases.test.js` |
| 7 | Concurrent joins at start | `joinRoom` and `startSpin` executing at the exact same instant | Transaction snapshots active members at start time; join preserves exact count | `spin.service.js` (transaction snapshot) | `spinEdgeCases.test.js` |
