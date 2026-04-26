const assert = require("assert/strict");
const { assertErrorResponse, assertFieldErrors } = require("../assertions/common.assertions");
const { assertCashbackSimulation } = require("../assertions/simulation.assertions");
const { buildCampaign } = require("../fixtures/campaigns");
const { buildCashbackSimulation } = require("../fixtures/simulations");
const { getAdminAccessToken } = require("../support/auth-session");
const { useApiHarness } = require("../support/test-harness");

describe("KAN-11 - US07 Simular cashback", function () {
  const test = useApiHarness();

  it("KAN-49 - Deve calcular cashback com base em campanha ativa elegivel", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaignPayload = buildCampaign({ cashbackRule: { value: 15, minPurchaseAmount: 100 } });
    const campaign = await createCampaign(test.campaignsClient, accessToken, campaignPayload);

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: campaignPayload.sellerId, purchaseAmount: 200 })
    );

    assert.equal(response.status(), 200);
    assertCashbackSimulation(await response.json(), {
      purchaseAmount: 200,
      cashbackAmount: 30,
      campaignName: campaign.name
    });
  });

  it("KAN-50 - Deve aplicar somente campanhas ativas quando houver campanhas ativas e pausadas para o mesmo contexto", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const sellerId = `seller-sim-${Date.now()}`;
    const pausedCampaign = await createCampaign(
      test.campaignsClient,
      accessToken,
      buildCampaign({ sellerId, name: "Cashback Pausado", cashbackRule: { value: 50, minPurchaseAmount: 100 } })
    );
    await test.campaignsClient.changeStatus(pausedCampaign.id, { status: "PAUSED", reason: "Pausa operacional" }, { accessToken });
    const activeCampaign = await createCampaign(
      test.campaignsClient,
      accessToken,
      buildCampaign({ sellerId, name: "Cashback Ativo", cashbackRule: { value: 15, minPurchaseAmount: 100 } })
    );

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId, purchaseAmount: 200 })
    );

    assert.equal(response.status(), 200);
    assertCashbackSimulation(await response.json(), {
      purchaseAmount: 200,
      cashbackAmount: 30,
      campaignName: activeCampaign.name
    });
  });

  it("KAN-51 - Deve informar ausencia de campanha elegivel quando nao houver campanha ativa aplicavel", async function () {
    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: `seller-sem-campanha-${Date.now()}` })
    );

    assert.equal(response.status(), 404);
    assertErrorResponse(await response.json(), {
      messagePattern: /Nenhuma campanha elegivel/i
    });
  });
});

describe("KAN-12 - US09 Bloquear valores invalidos no simulador", function () {
  const test = useApiHarness();

  it("KAN-52 - Deve rejeitar valor de compra negativo no simulador", async function () {
    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ purchaseAmount: -10 })
    );
    const body = await response.json();

    assert.equal(response.status(), 422);
    assertFieldErrors(body.fieldErrors, ["purchaseAmount"]);
  });

  it("KAN-53 - Deve rejeitar requisicao do simulador com valor de compra ausente", async function () {
    const payload = buildCashbackSimulation();
    delete payload.purchaseAmount;

    const response = await test.simulationsClient.simulateCashback(payload);
    const body = await response.json();

    assert.equal(response.status(), 422);
    assertFieldErrors(body.fieldErrors, ["purchaseAmount"]);
  });

  it("KAN-54 - Deve exibir mensagem de validacao apropriada quando payload do simulador for invalido", async function () {
    const response = await test.simulationsClient.simulateCashback({
      customerId: "uuid",
      sellerId: "",
      purchaseAmount: -10,
      purchaseDate: "data-invalida",
      paymentMethod: "PIX"
    });
    const body = await response.json();

    assert.equal(response.status(), 422);
    assert.equal(body.code, "VALIDATION_ERROR");
    assertFieldErrors(body.fieldErrors, ["customerId", "sellerId", "purchaseAmount", "purchaseDate"]);
  });
});

describe("KAN-13 - US08 Respeitar valor minimo no simulador", function () {
  const test = useApiHarness();

  it("KAN-55 - Deve impedir cashback quando compra estiver abaixo do valor minimo da campanha", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaignPayload = buildCampaign({ cashbackRule: { value: 15, minPurchaseAmount: 100 } });
    await createCampaign(test.campaignsClient, accessToken, campaignPayload);

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: campaignPayload.sellerId, purchaseAmount: 99.99 })
    );

    assert.equal(response.status(), 404);
    assertErrorResponse(await response.json(), {
      messagePattern: /Nenhuma campanha elegivel/i
    });
  });

  it("KAN-56 - Deve considerar elegivel compra com valor exatamente igual ao minimo da campanha", async function () {
    const accessToken = await getAdminAccessToken(test.authClient);
    const campaignPayload = buildCampaign({ cashbackRule: { value: 15, minPurchaseAmount: 100 } });
    const campaign = await createCampaign(test.campaignsClient, accessToken, campaignPayload);

    const response = await test.simulationsClient.simulateCashback(
      buildCashbackSimulation({ sellerId: campaignPayload.sellerId, purchaseAmount: 100 })
    );

    assert.equal(response.status(), 200);
    assertCashbackSimulation(await response.json(), {
      purchaseAmount: 100,
      cashbackAmount: 15,
      campaignName: campaign.name
    });
  });
});

async function createCampaign(campaignsClient, accessToken, payload) {
  const response = await campaignsClient.create(payload, { accessToken });
  assert.equal(response.status(), 201);
  return response.json();
}
