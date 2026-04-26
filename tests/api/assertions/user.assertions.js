const assert = require("assert/strict");
const { assertValidIsoDate } = require("./common.assertions");

function assertRegisteredUser(body, expected) {
  assert.equal(typeof body.id, "string");
  assert.equal(body.fullName, expected.fullName);
  assert.equal(body.email, expected.email.toLowerCase());
  assert.equal(body.document, expected.document);
  assert.equal(body.state, expected.state);
  assert.equal(body.status, "ACTIVE");
  assertValidIsoDate(body.createdAt);
}

module.exports = {
  assertRegisteredUser
};
