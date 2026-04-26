const assert = require("assert/strict");
const { assertValidIsoDate } = require("./common.assertions");

function assertCashbackSimulation(body, expected) {
  assert.equal(body.eligible, true);
  assert.equal(body.purchaseAmount, expected.purchaseAmount);
  assert.equal(body.cashbackAmount, expected.cashbackAmount);
  assert.equal(body.currency, "BRL");
  assert.equal(Array.isArray(body.appliedCampaigns), true);
  assert.ok(body.appliedCampaigns.length > 0, "Expected at least one applied campaign");
  assert.equal(body.appliedCampaigns[0].campaignName, expected.campaignName);
  assert.equal(body.appliedCampaigns[0].cashbackAmount, expected.cashbackAmount);
  assertValidIsoDate(body.processedAt);
}

module.exports = {
  assertCashbackSimulation
};
