const { AuthClient } = require("../clients/auth.client");
const { CampaignsClient } = require("../clients/campaigns.client");
const { SimulationsClient } = require("../clients/simulations.client");
const { UsersClient } = require("../clients/users.client");
const { createApiContext } = require("./api-context");
const { startApiServer } = require("./api-server");

function useApiHarness() {
  const state = {};

  before(async function () {
    state.apiServer = await startApiServer();
  });

  beforeEach(async function () {
    state.api = await createApiContext(state.apiServer.baseURL);
    state.authClient = new AuthClient(state.api);
    state.campaignsClient = new CampaignsClient(state.api);
    state.simulationsClient = new SimulationsClient(state.api);
    state.usersClient = new UsersClient(state.api);
  });

  afterEach(async function () {
    await state.api.dispose();
  });

  after(async function () {
    await state.apiServer.close();
  });

  return state;
}

module.exports = {
  useApiHarness
};
