const http = require("http");
const app = require("../../../src/app");
const { apiConfig } = require("../config/api.config");

async function startApiServer() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, apiConfig.host, resolve));

  const { port } = server.address();

  return {
    baseURL: `http://${apiConfig.host}:${port}`,
    close: () => closeServer(server)
  };
}

async function closeServer(server) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

module.exports = {
  startApiServer
};
