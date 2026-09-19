import { EventEmitter } from 'node:events';

// Domain events emitted by services:
// - user_joined
// - user_left
// - draft_shared
// - spin_started
// - user_eliminated
// - winner_announced
// TODO: EventEmitter is in-memory for a single node instance; replace with Redis Pub/Sub for horizontal scaling across nodes.
class TypedEventBus extends EventEmitter {}

export const eventBus = new TypedEventBus();
