const { randomUUID } = require("crypto");

function buildUser(overrides = {}) {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  return {
    fullName: overrides.fullName || `Cliente Teste ${suffix}`,
    email: overrides.email || `cliente.${suffix}@marketplace.com`,
    document: overrides.document || buildDocument(suffix),
    password: overrides.password || "cliente123",
    state: overrides.state || "SP"
  };
}

function buildDocument(seed) {
  const digits = seed.replace(/\D/g, "").padEnd(11, "0").slice(0, 11);
  return digits === "12345678900" ? "98765432199" : digits;
}

module.exports = {
  buildUser
};
