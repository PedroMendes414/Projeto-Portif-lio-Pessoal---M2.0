const assert = require("assert/strict");

function assertErrorResponse(body, { code, messagePattern }) {
  if (code) {
    assert.equal(body.code, code);
  } else {
    assert.equal(typeof body.code, "string");
  }

  assert.match(body.message, messagePattern);
  assertValidIsoDate(body.timestamp);
}

function assertFieldErrors(fieldErrors, expectedFields) {
  assert.equal(Array.isArray(fieldErrors), true);

  expectedFields.forEach((field) => {
    assert.ok(
      fieldErrors.some((fieldError) => fieldError.field === field),
      `Expected validation error for field "${field}"`
    );
  });
}

function assertStatusIn(actualStatus, expectedStatuses) {
  assert.ok(
    expectedStatuses.includes(actualStatus),
    `Expected status ${actualStatus} to be one of: ${expectedStatuses.join(", ")}`
  );
}

function assertValidIsoDate(value) {
  assert.equal(typeof value, "string");
  assert.equal(Number.isNaN(Date.parse(value)), false);
}

module.exports = {
  assertErrorResponse,
  assertFieldErrors,
  assertStatusIn,
  assertValidIsoDate
};
