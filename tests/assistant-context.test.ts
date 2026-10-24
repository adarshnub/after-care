import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoRecord } from "../src/lib/demo";
import { assistantContext } from "../src/lib/server/assistant-context";

test("assistant supply reflects recorded refills and doses while excluding account identity", () => {
  const record = createDemoRecord();
  record.id = "private-record-identity";
  record.patientUserId = "private-auth-identity";
  record.email = "private-identity@example.test";
  record.refills = [{
    id: "private-refill-identity",
    medicationId: "med-1",
    quantity: 20,
    addedAt: new Date().toISOString(),
    addedBy: "private-refill-author",
  }];
  const context = assistantContext(record);
  const supply = context.medicationSupply.find((m) => m.medicationId === "med-1")!;
  assert.equal(supply.estimatedRemainingUnits, 30);
  assert.equal(supply.estimatedDaysLeft, 10);
  assert.equal(record.plan.medications[0].quantity, 11);
  const serialized = JSON.stringify(context);
  for (const identity of [record.id, record.email, record.patientUserId, record.refills[0].id, record.refills[0].addedBy]) {
    assert.equal(serialized.includes(identity), false);
  }
  assert.equal("completedBy" in context.completions[0], false);
});
