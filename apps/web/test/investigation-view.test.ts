import assert from "node:assert/strict";
import { test } from "node:test";

import {
  initialInvestigationTab,
  isCaseReady,
} from "../features/investigations/model/investigation-view";

test("completed investigations reopen on Case details", () => {
  for (const status of ["ready-for-review", "escalated", "closed"] as const) {
    assert.equal(isCaseReady(status), true);
    assert.equal(initialInvestigationTab(status), "case");
  }
});

test("active, blocked and failed investigations open on Agent investigator", () => {
  for (const status of ["queued", "investigating", "needs-input", "failed"] as const) {
    assert.equal(isCaseReady(status), false);
    assert.equal(initialInvestigationTab(status), "agent");
  }
});
