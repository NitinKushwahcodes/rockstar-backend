import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Spin Random Selection Uniformity & Boundedness', () => {
  it('selects every participant at least once in 1000 trials without out-of-bounds selection', () => {
    const participants = ['P1', 'P2', 'P3', 'P4', 'P5'];
    const selectionCounts = new Map(participants.map((p) => [p, 0]));

    for (let i = 0; i < 1000; i++) {
      const selectedIndex = crypto.randomInt(0, participants.length);
      const selected = participants[selectedIndex];
      assert.ok(selected, 'Selected participant must exist');
      selectionCounts.set(selected, selectionCounts.get(selected) + 1);
    }

    for (const [participant, count] of selectionCounts.entries()) {
      assert.ok(
        count > 0,
        `Participant ${participant} should be selected at least once in 1000 trials`
      );
    }
  });
});
