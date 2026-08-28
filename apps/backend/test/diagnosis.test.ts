import assert from "node:assert/strict";
import { test } from "node:test";

import { createInvestigationDiagnosis } from "../src/modules/investigations/diagnosis.js";

const base = {
  headline: "A cause was identified",
  summary: "The available data points to one explanation.",
  impact: "One workflow is affected.",
  recommendedNextStep: "Validate the fix.",
  drafts: { engineering: null, customerReply: null },
};

test("confirmed diagnoses require verified evidence", () => {
  const diagnosis = createInvestigationDiagnosis({
    ...base,
    verdict: "confirmed",
    confidence: "high",
    evidence: [
      {
        id: "reported-1",
        title: "Customer report",
        summary: "The customer reported a failure.",
        source: "Intercom",
        verification: "reported",
      },
    ],
    evidenceIds: ["reported-1"],
  });

  assert.equal(diagnosis.verdict, "inconclusive");
  assert.equal(diagnosis.confidence, null);
});

test("diagnoses retain only existing evidence references", () => {
  const diagnosis = createInvestigationDiagnosis({
    ...base,
    verdict: "likely",
    confidence: "medium",
    evidence: [
      {
        id: "verified-1",
        title: "Verified event",
        summary: "The event matches the reported time window.",
        source: "Sentry",
        verification: "verified",
      },
    ],
    evidenceIds: ["missing", "verified-1", "verified-1"],
  });

  assert.equal(diagnosis.verdict, "likely");
  assert.deepEqual(diagnosis.evidenceIds, ["verified-1"]);
});

test("blocking limitations prevent a confirmed verdict", () => {
  const diagnosis = createInvestigationDiagnosis({
    ...base,
    verdict: "confirmed",
    confidence: "high",
    hasBlockingLimitations: true,
    evidence: [
      {
        id: "verified-1",
        title: "Verified event",
        summary: "The event is verified but incomplete.",
        source: "Sentry",
        verification: "verified",
      },
    ],
    evidenceIds: ["verified-1"],
  });

  assert.equal(diagnosis.verdict, "inconclusive");
  assert.equal(diagnosis.confidence, null);
});
