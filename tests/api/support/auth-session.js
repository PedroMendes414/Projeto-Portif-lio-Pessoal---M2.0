const assert = require("assert/strict");
const { adminCredentials, userCredentials } = require("../fixtures/credentials");

async function getAdminAccessToken(authClient) {
  const response = await authClient.adminLogin(adminCredentials.valid);

  assert.equal(response.status(), 200);
  return (await response.json()).accessToken;
}

async function getUserAccessToken(authClient) {
  const response = await authClient.userLogin(userCredentials.valid);

  assert.equal(response.status(), 200);
  return (await response.json()).accessToken;
}

module.exports = {
  getAdminAccessToken,
  getUserAccessToken
};
