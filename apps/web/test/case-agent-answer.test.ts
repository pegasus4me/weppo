import assert from "node:assert/strict";
import { test } from "node:test";

import { MockInvestigationStream } from "../features/investigations/data/mock-investigation-stream";

test("mock case questions return an answer without timeline activity", async () => {
  const stream = new MockInvestigationStream();
  const events: unknown[] = [];
  const disconnect = stream.connect({
    caseId: "salesforce-sync-failure",
    afterSequence: 0,
    onEvent: (event) => events.push(event),
    onConnectionChange: () => undefined,
  });

  const answer = await stream.sendFollowUp(
    "salesforce-sync-failure",
    "Draft a customer follow-up",
  );

  assert.match(answer, /synchronization failures/i);
  assert.deepEqual(events, []);
  disconnect();
});
