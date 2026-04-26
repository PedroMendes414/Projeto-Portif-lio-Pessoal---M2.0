const assert = require("assert/strict");
const { assertCampaignPage, assertCampaignResponse, assertCampaignSummary } = require("../assertions/campaign.assertions");
const { assertErrorResponse, assertFieldErrors, assertStatusIn } = require("../assertions/common.assertions");
const { assertCashbackSimulation } = require("../assertions/simulation.assertions");
const { buildCampaign, futureValidity } = require("../fixtures/campaigns");
const { buildCashbackSimulation, existingCustomerId } = require("../fixtures/simulations");
const { getAdminAccessToken, getUserAccessToken } = require("../support/auth-session");
const { useApiHarness } = require("../support/test-harness");

describe("KAN-7 - US03 Visualizar lista de campanhas", function () {
  const test = useApiHarness();

  it("KAN-27 - Deve listar campanhas administrativas exibindo campos principais", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const response = await test.campaignsClient.list({ accessToken });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assertCampaignPage(body);
    assert.ok(body.content.length > 0, "Expected at least one campaign in the administrative listing");
    assertCampaignSummary(body.content[0]);
  });

  it("KAN-28 - Deve permitir identificar campanhas ativas na listagem administrativa", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const response = await test.campaignsClient.list({
      accessToken,
      params: { status: "ACTIVE" }
    });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assertCampaignPage(body);
    body.content.forEach((campaign) => assert.equal(campaign.status, "ACTIVE"));
  });

  it("KAN-29 - Deve permitir identificar campanhas pausadas na listagem administrativa", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, accessToken, buildCampaign());
    await test.campaignsClient.changeStatus(campaign.id, { status: "PAUSED", reason: "Pausa operacional" }, { accessToken });

    const response = await test.campaignsClient.list({
      accessToken,
      params: { status: "PAUSED" }
    });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assertCampaignPage(body);
    assert.ok(body.content.some((item) => item.id === campaign.id && item.status === "PAUSED"));
  });

  it("KAN-31 - Deve impedir acesso a listagem administrativa de campanhas sem login", async function () {
    const response = await test.campaignsClient.list();

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas|token ausente/i
    });
  });
});

describe("KAN-8 - US04 Criar campanha de cashback", function () {
  const test = useApiHarness();

  it("KAN-30 - Deve criar nova campanha com dados obrigatorios validos", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const payload = buildCampaign();
    const response = await test.campaignsClient.create(payload, { accessToken });
    const body = await response.json();

    assert.equal(response.status(), 201);
    assertCampaignResponse(body, payload);
    assertStatusIn(body.status, ["ACTIVE", "SCHEDULED", "EXPIRED"]);
  });

  it("KAN-32 - Deve impedir criacao de campanha quando campos obrigatorios nao forem informados", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const { name, ...payloadWithoutName } = buildCampaign();
    const response = await test.campaignsClient.create(payloadWithoutName, { accessToken });
    const body = await response.json();

    assert.equal(response.status(), 422);
    assert.equal(body.code, "VALIDATION_ERROR");
    assertFieldErrors(body.fieldErrors, ["name"]);
  });

  it("KAN-33 - Deve disponibilizar campanha recem-criada na listagem administrativa", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, accessToken, buildCampaign());

    const response = await test.campaignsClient.list({ accessToken });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assert.ok(body.content.some((item) => item.id === campaign.id && item.name === campaign.name));
  });

  it("KAN-34 - Deve impedir criacao de campanha sem autenticacao administrativa", async function () {
    const response = await test.campaignsClient.create(buildCampaign());

    assert.equal(response.status(), 401);
    assertErrorResponse(await response.json(), {
      messagePattern: /Credenciais invalidas|token ausente/i
    });
  });

  it("KAN-35 - Deve impedir criacao de campanha por usuario comum autenticado", async function () {
    const accessToken = await getUserAccessToken(test.authClient);
    const response = await test.campaignsClient.create(buildCampaign(), { accessToken });

    assert.equal(response.status(), 403);
    assertErrorResponse(await response.json(), {
      code: "FORBIDDEN",
      messagePattern: /Perfil sem permissao/i
    });
  });
});

describe("KAN-9 - Validacoes de cadastro de campanha", function () {
  const test = useApiHarness();

  it("KAN-36 - Deve rejeitar campanha com percentual de cashback menor ou igual a zero", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const response = await test.campaignsClient.create(
      buildCampaign({ cashbackRule: { value: 0 } }),
      { accessToken }
    );
    const body = await response.json();

    assert.equal(response.status(), 422);
    assertFieldErrors(body.fieldErrors, ["cashbackRule.value"]);
  });

  it("KAN-37 - Deve rejeitar campanha com valor minimo de compra negativo", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const response = await test.campaignsClient.create(
      buildCampaign({ cashbackRule: { minPurchaseAmount: -10 } }),
      { accessToken }
    );
    const body = await response.json();

    assert.equal(response.status(), 422);
    assertFieldErrors(body.fieldErrors, ["cashbackRule.minPurchaseAmount"]);
  });

  it("KAN-38 - Deve rejeitar campanha com nome em branco", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const response = await test.campaignsClient.create(buildCampaign({ name: "" }), { accessToken });
    const body = await response.json();

    assert.equal(response.status(), 422);
    assertFieldErrors(body.fieldErrors, ["name"]);
  });

  it("KAN-39 - Deve exibir mensagens claras quando multiplas regras forem violadas", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const response = await test.campaignsClient.create(
      buildCampaign({
        name: "",
        description: "curta",
        validity: {
          startAt: futureValidity().endAt,
          endAt: futureValidity().startAt
        },
        cashbackRule: {
          value: 0,
          minPurchaseAmount: -10
        }
      }),
      { accessToken }
    );
    const body = await response.json();

    assert.equal(response.status(), 422);
    assertFieldErrors(body.fieldErrors, ["name", "description", "validity", "cashbackRule.value", "cashbackRule.minPurchaseAmount"]);
  });
});

describe("KAN-10 - Pausa, reativacao e exclusao de campanhas", function () {
  const test = useApiHarness();

  it("KAN-40 - Deve permitir pausar uma campanha ativa", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, accessToken, buildCampaign());

    const response = await test.campaignsClient.changeStatus(campaign.id, { status: "PAUSED", reason: "Pausa operacional" }, { accessToken });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assert.equal(body.id, campaign.id);
    assert.equal(body.status, "PAUSED");
  });

  it("KAN-41 - Deve deixar de considerar campanha pausada no simulador", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const payload = buildCampaign({ cashbackRule: { value: 15, minPurchaseAmount: 100 } });
    const campaign = await createCampaign(test.campaignsClient, accessToken, payload);
    await test.campaignsClient.changeStatus(campaign.id, { status: "PAUSED", reason: "Pausa operacional" }, { accessToken });

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: payload.sellerId, purchaseAmount: 150 })
    );

    assert.equal(response.status(), 404);
    assertErrorResponse(await response.json(), {
      messagePattern: /Nenhuma campanha elegivel/i
    });
  });

  it("KAN-42 - Deve permitir reativar uma campanha pausada", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, accessToken, buildCampaign());
    await test.campaignsClient.changeStatus(campaign.id, { status: "PAUSED", reason: "Pausa operacional" }, { accessToken });

    const response = await test.campaignsClient.changeStatus(campaign.id, { status: "ACTIVE", reason: "Retomada operacional" }, { accessToken });
    const body = await response.json();

    assert.equal(response.status(), 200);
    assert.equal(body.id, campaign.id);
    assert.equal(body.status, "ACTIVE");
  });

  it("KAN-43 - Deve considerar novamente no simulador a campanha reativada", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const payload = buildCampaign({ cashbackRule: { value: 15, minPurchaseAmount: 100 } });
    const campaign = await createCampaign(test.campaignsClient, accessToken, payload);
    await test.campaignsClient.changeStatus(campaign.id, { status: "PAUSED", reason: "Pausa operacional" }, { accessToken });
    await test.campaignsClient.changeStatus(campaign.id, { status: "ACTIVE", reason: "Retomada operacional" }, { accessToken });

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: payload.sellerId, purchaseAmount: 150 })
    );

    assert.equal(response.status(), 200);
    assertCashbackSimulation(await response.json(), {
      purchaseAmount: 150,
      cashbackAmount: 22.5,
      campaignName: campaign.name
    });
  });

  it("KAN-44 - Deve permitir que usuario administrador exclua campanha globalmente", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, accessToken, buildCampaign());
    const response = await test.campaignsClient.delete(campaign.id, { accessToken });

    assert.equal(response.status(), 204);
  });

  it("KAN-45 - Deve deixar de localizar a campanha apos exclusao global", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, accessToken, buildCampaign());
    assert.equal((await test.campaignsClient.delete(campaign.id, { accessToken })).status(), 204);

    const response = await test.campaignsClient.get(campaign.id, { accessToken });

    assert.equal(response.status(), 404);
    assertErrorResponse(await response.json(), {
      messagePattern: /Campanha nao encontrada|Recurso nao encontrado/i
    });
  });

  it("KAN-46 - Deve permitir que usuario comum exclua apenas campanha associada ao proprio cadastro", async function () {
    const adminToken = await getAdminAccessToken(test.authClient);
    const userToken = await getUserAccessToken(test.authClient);
    const campaign = await createCampaign(
      test.campaignsClient,
      adminToken,
      buildCampaign({ audience: { segment: "SELLER_DEFINED", customerIds: [existingCustomerId] } })
    );

    const response = await test.usersClient.deleteMyCampaign(campaign.id, { accessToken: userToken });

    assert.equal(response.status(), 204);
  });

  it("KAN-47 - Deve impedir que usuario comum exclua campanha que nao esta associada ao proprio cadastro", async function () {
    const adminToken = await getAdminAccessToken(test.authClient);
    const userToken = await getUserAccessToken(test.authClient);
    const campaign = await createCampaign(
      test.campaignsClient,
      adminToken,
      buildCampaign({ audience: { segment: "SELLER_DEFINED", customerIds: ["22222222-2222-4222-8222-222222222222"] } })
    );

    const response = await test.usersClient.deleteMyCampaign(campaign.id, { accessToken: userToken });

    assertStatusIn(response.status(), [403, 404]);
  });

  it("KAN-48 - Deve impedir que usuario comum execute exclusao global de campanha", async function () {
    const adminToken = await getAdminAccessToken(test.authClient);
    const userToken = await getUserAccessToken(test.authClient);
    const campaign = await createCampaign(test.campaignsClient, adminToken, buildCampaign());
    const response = await test.campaignsClient.delete(campaign.id, { accessToken: userToken });

    assert.equal(response.status(), 403);
    assertErrorResponse(await response.json(), {
      code: "FORBIDDEN",
      messagePattern: /Perfil sem permissao/i
    });
  });
});

async function createCampaign(campaignsClient, accessToken, payload) {
  const response = await campaignsClient.create(payload, { accessToken });
  assert.equal(response.status(), 201);
  return response.json();
}
