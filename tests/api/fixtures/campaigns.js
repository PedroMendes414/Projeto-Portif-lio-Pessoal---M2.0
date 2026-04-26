const { randomUUID } = require("crypto");

function activeValidity() {
  return {
    startAt: daysFromNow(-1),
    endAt: daysFromNow(30)
  };
}

function futureValidity() {
  return {
    startAt: daysFromNow(1),
    endAt: daysFromNow(30)
  };
}

function buildCampaign(overrides = {}) {
  const id = randomUUID().slice(0, 8);
  const sellerId = overrides.sellerId || `seller-${id}`;
  const name = Object.hasOwn(overrides, "name") ? overrides.name : `Cashback ${id}`;

  return {
    name,
    description: Object.hasOwn(overrides, "description") ? overrides.description : `Campanha automatizada ${id}`,
    sellerId,
    validity: overrides.validity || activeValidity(),
    cashbackRule: {
      type: "PERCENTAGE",
      value: 15,
      currency: "BRL",
      minPurchaseAmount: 100,
      allowedPaymentMethods: ["PIX"],
      ...(overrides.cashbackRule || {})
    },
    audience: {
      segment: "ALL",
      states: ["SP"],
      customerIds: [],
      ...(overrides.audience || {})
    },
    stackable: overrides.stackable ?? false,
    priority: overrides.priority ?? 100
  };
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

module.exports = {
  activeValidity,
  buildCampaign,
  daysFromNow,
  futureValidity
};
