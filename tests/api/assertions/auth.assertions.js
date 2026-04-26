const assert = require("assert/strict");

function assertAdminTokenResponse(body) {
  assert.equal(typeof body.accessToken, "string");
  assert.ok(body.accessToken.length > 0, "Expected a non-empty access token");
  assert.equal(body.tokenType, "Bearer");
  assert.equal(body.expiresIn, 3600);
  assert.equal(body.user.email, "gestor@marketplace.com");
  assert.equal(body.user.role, "ADMIN");
  assert.equal(typeof body.user.id, "string");
  assert.equal(typeof body.user.name, "string");
}

function assertCustomerTokenResponse(body, expectedEmail) {
  assert.equal(typeof body.accessToken, "string");
  assert.ok(body.accessToken.length > 0, "Expected a non-empty access token");
  assert.equal(body.tokenType, "Bearer");
  assert.equal(body.expiresIn, 3600);
  assert.equal(body.user.email, expectedEmail);
  assert.equal(body.user.role, "CUSTOMER");
  assert.equal(typeof body.user.id, "string");
  assert.equal(typeof body.user.fullName, "string");
  assert.equal(typeof body.user.document, "string");
  assert.equal(body.user.status, "ACTIVE");
}

module.exports = {
  assertAdminTokenResponse,
  assertCustomerTokenResponse
};
