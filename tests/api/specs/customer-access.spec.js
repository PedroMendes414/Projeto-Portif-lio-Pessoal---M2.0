const assert = require("assert/strict");
const { assertCustomerTokenResponse } = require("../assertions/auth.assertions");
const { assertCampaignPage } = require("../assertions/campaign.assertions");
const { assertErrorResponse } = require("../assertions/common.assertions");
const { assertCashbackSimulation } = require("../assertions/simulation.assertions");
const { buildCampaign } = require("../fixtures/campaigns");
const { userCredentials } = require("../fixtures/credentials");
const { buildCashbackSimulation, existingCustomerId } = require("../fixtures/simulations");
const { getAdminAccessToken, getUserAccessToken } = require("../support/auth-session");
const { useApiHarness } = require("../support/test-harness");

describe("KAN-14 - US10 Login de usuario comum e visualizacao das proprias campanhas", function () {
  const test = useApiHarness();

  it("KAN-57 - Deve autenticar usuario comum com e-mail e senha validos", async function () {
    const response = await test.authClient.userLogin(userCredentials.valid);

    assert.equal(response.status(), 200);
    assertCustomerTokenResponse(await response.json(), userCredentials.valid.email);
  });

  it("KAN-58 - Deve rejeitar login de usuario comum com credenciais invalidas", async function () {
    const response = await test.authClient.userLogin(userCredentials.invalidPassword);

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas/i
    });
  });

  it("KAN-59 - Deve impedir acesso a listagem de campanhas do usuario comum sem autenticacao", async function () {
    const response = await test.usersClient.listMyCampaigns();

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas|token ausente/i
    });
  });

  it("KAN-60 - Deve listar somente campanhas associadas ao usuario comum autenticado", async function () {
    const adminToken = await getAdminAccessToken(test.authClient);
    const userToken = await getUserAccessToken(test.authClient);
    const campaign = await createCampaign(
      test.campaignsClient,
      adminToken,
      buildCampaign({ audience: { segment: "SELLER_DEFINED", customerIds: [existingCustomerId] } })
    );

    const response = await test.usersClient.listMyCampaigns({ accessToken: userToken });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assertCampaignPage(body);
    assert.ok(body.content.some((item) => item.id === campaign.id));
    body.content.forEach((item) => {
      if (item.audience.customerIds.length > 0) {
        assert.ok(item.audience.customerIds.includes(existingCustomerId));
      }
    });
  });

  it("KAN-61 - Deve impedir usuario comum de acessar criacao administrativa de campanha", async function () {
    const userToken = await getUserAccessToken(test.authClient);
    const response = await test.campaignsClient.create(buildCampaign(), { accessToken: userToken });

    assert.equal(response.status(), 403);
    assertErrorResponse(await response.json(), {
      code: "FORBIDDEN",
      messagePattern: /Perfil sem permissao/i
    });
  });

  it("KAN-62 - Deve considerar no simulador apenas campanhas visiveis e elegiveis para usuario comum", async function () {
    const adminToken = await getAdminAccessToken(test.authClient);
    const campaignPayload = buildCampaign({
      cashbackRule: { value: 10, minPurchaseAmount: 50 },
      audience: { segment: "SELLER_DEFINED", customerIds: [existingCustomerId] }
    });
    const campaign = await createCampaign(test.campaignsClient, adminToken, campaignPayload);

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: campaignPayload.sellerId, purchaseAmount: 200 })
    );

    assert.equal(response.status(), 200);
    assertCashbackSimulation(await response.json(), {
      purchaseAmount: 200,
      cashbackAmount: 20,
      campaignName: campaign.name
    });
  });
});

async function createCampaign(campaignsClient, accessToken, payload) {
  const response = await campaignsClient.create(payload, { accessToken });
  assert.equal(response.status(), 201);
  return response.json();
}
