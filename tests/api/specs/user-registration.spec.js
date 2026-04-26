const assert = require("assert/strict");
const { assertCustomerTokenResponse } = require("../assertions/auth.assertions");
const { assertErrorResponse, assertFieldErrors } = require("../assertions/common.assertions");
const { assertRegisteredUser } = require("../assertions/user.assertions");
const { buildUser } = require("../fixtures/users");
const { getUserAccessToken } = require("../support/auth-session");
const { useApiHarness } = require("../support/test-harness");

describe("KAN-6 - US02 Cadastro de usuario comum", function () {
  const test = useApiHarness();

  it("KAN-22 - Deve cadastrar usuario comum com dados validos", async function () {
    const payload = buildUser();
    const response = await test.usersClient.register(payload);

    assert.equal(response.status(), 201);
    assertRegisteredUser(await response.json(), payload);
  });

  it("KAN-23 - Deve impedir cadastro de usuario comum com e-mail ja existente", async function () {
    const payload = buildUser();

    assert.equal((await test.usersClient.register(payload)).status(), 201);
    const response = await test.usersClient.register({
      ...buildUser(),
      email: payload.email
    });

    assert.equal(response.status(), 409);
    assertErrorResponse(await response.json(), {
      messagePattern: /Email ou documento ja cadastrado/i
    });
  });

  it("KAN-24 - Deve validar campos obrigatorios no cadastro de usuario comum", async function () {
    const response = await test.usersClient.register({
      fullName: "Al",
      email: "email-invalido",
      document: "",
      password: "123"
    });
    const body = await response.json();

    assert.equal(response.status(), 422);
    assert.equal(body.code, "VALIDATION_ERROR");
    assertFieldErrors(body.fieldErrors, ["fullName", "email", "document", "password"]);
  });

  it("KAN-25 - Deve permitir login de usuario comum com credenciais validas apos cadastro", async function () {
    const payload = buildUser();
    assert.equal((await test.usersClient.register(payload)).status(), 201);

    const response = await test.authClient.userLogin({
      email: payload.email,
      password: payload.password
    });

    assert.equal(response.status(), 200);
    assertCustomerTokenResponse(await response.json(), payload.email);
  });

  it("KAN-26 - Deve impedir que usuario comum autenticado acesse funcionalidades administrativas", async function () {
    const accessToken = await getUserAccessToken(test.authClient);
    const response = await test.campaignsClient.list({ accessToken });

    assert.equal(response.status(), 403);
    assertErrorResponse(await response.json(), {
      code: "FORBIDDEN",
      messagePattern: /Perfil sem permissao/i
    });
  });
});
