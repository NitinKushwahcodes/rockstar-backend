import { EventEmitter } from 'node:events';

// Domain events emitted by services:
// - user_joined
// - user_left
// - draft_shared
// - spin_started
// - user_eliminated
// - winner_announced
class TypedEventBus extends EventEmitter {}

export const eventBus = new TypedEventBus();
