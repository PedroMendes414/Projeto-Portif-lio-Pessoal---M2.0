const { request } = require("@playwright/test");

function createApiContext(baseURL) {
  return request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });
}

module.exports = {
  createApiContext
};
