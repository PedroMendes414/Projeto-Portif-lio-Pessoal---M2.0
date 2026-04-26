const assert = require("assert/strict");

function assertCampaignPage(body) {
  assert.equal(Array.isArray(body.content), true);
  assert.equal(body.page, 0);
  assert.equal(body.size, 20);
  assert.equal(typeof body.totalElements, "number");
  assert.equal(typeof body.totalPages, "number");
}

function assertCampaignSummary(campaign) {
  assert.equal(typeof campaign.id, "string");
  assert.equal(typeof campaign.name, "string");
  assert.equal(typeof campaign.status, "string");
  assert.equal(typeof campaign.cashbackRule, "object");
  assert.equal(typeof campaign.cashbackRule.value, "number");
  assert.equal(typeof campaign.cashbackRule.minPurchaseAmount, "number");
}

function assertCampaignResponse(body, expected) {
  assert.equal(typeof body.id, "string");
  assert.equal(body.name, expected.name);
  assert.equal(body.description, expected.description);
  assert.equal(body.sellerId, expected.sellerId);
  assert.equal(body.cashbackRule.type, expected.cashbackRule.type);
  assert.equal(body.cashbackRule.value, expected.cashbackRule.value);
  assert.equal(body.cashbackRule.currency, expected.cashbackRule.currency);
  assert.equal(body.cashbackRule.minPurchaseAmount, expected.cashbackRule.minPurchaseAmount);
  assert.equal(typeof body.status, "string");
  assert.equal(typeof body.createdAt, "string");
  assert.equal(typeof body.updatedAt, "string");
}

module.exports = {
  assertCampaignPage,
  assertCampaignResponse,
  assertCampaignSummary
};
