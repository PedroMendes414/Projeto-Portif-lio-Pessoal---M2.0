const assert = require("assert/strict");
const { assertAdminTokenResponse } = require("../assertions/auth.assertions");
const { assertCampaignPage } = require("../assertions/campaign.assertions");
const { assertErrorResponse, assertFieldErrors, assertValidIsoDate } = require("../assertions/common.assertions");
const { AuthClient } = require("../clients/auth.client");
const { CampaignsClient } = require("../clients/campaigns.client");
const { adminCredentials } = require("../fixtures/credentials");
const { createApiContext } = require("../support/api-context");
const { startApiServer } = require("../support/api-server");
const { getAdminAccessToken, getUserAccessToken } = require("../support/auth-session");

describe("KAN-5 - US01 Login administrativo", function () {
  let apiServer;
  let api;
  let authClient;
  let campaignsClient;

  before(async function () {
    apiServer = await startApiServer();
  });

  beforeEach(async function () {
    api = await createApiContext(apiServer.baseURL);
    authClient = new AuthClient(api);
    campaignsClient = new CampaignsClient(api);
  });

  afterEach(async function () {
    await api.dispose();
  });

  after(async function () {
    await apiServer.close();
  });

  it("KAN-15 - Deve autenticar gestor com credenciais validas e retornar token de acesso", async function () {
    const response = await authClient.adminLogin(adminCredentials.valid);

    assert.equal(response.status(), 200);
    assertAdminTokenResponse(await response.json());
  });

  it("KAN-16 - Deve rejeitar autenticacao administrativa com senha incorreta", async function () {
    const response = await authClient.adminLogin(adminCredentials.invalidPassword);

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas/i
    });
  });

  it("KAN-17 - Deve rejeitar autenticacao administrativa com usuario invalido", async function () {
    const response = await authClient.adminLogin(adminCredentials.invalidEmail);

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas/i
    });
  });

  it("KAN-18 - Deve validar campos obrigatorios e formato da requisicao no login administrativo", async function () {
    const response = await authClient.adminLogin(adminCredentials.invalidPayload);
    const body = await response.json();

    assert.equal(response.status(), 422);
    assert.equal(body.code, "VALIDATION_ERROR");
    assertFieldErrors(body.fieldErrors, ["email", "password"]);
    assertValidIsoDate(body.timestamp);
  });

  it("KAN-19 - Deve permitir acesso a listagem administrativa de campanhas com token valido", async function () {
    const accessToken = await getAdminAccessToken(authClient);
    const response = await campaignsClient.list({ accessToken });

    assert.equal(response.status(), 200);
    assertCampaignPage(await response.json());
  });

  it("KAN-20 - Deve impedir acesso a listagem administrativa de campanhas sem token", async function () {
    const response = await campaignsClient.list();

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas|token ausente/i
    });
  });

  it("KAN-21 - Deve negar acesso a listagem administrativa de campanhas com token de usuario comum", async function () {
    const accessToken = await getUserAccessToken(authClient);
    const response = await campaignsClient.list({ accessToken });

    assert.equal(response.status(), 403);
    assertErrorResponse(await response.json(), {
      code: "FORBIDDEN",
      messagePattern: /Perfil sem permissao/i
    });
  });
});
