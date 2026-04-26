const existingCustomerId = "11111111-1111-4111-8111-111111111111";

function buildCashbackSimulation(overrides = {}) {
  return {
    customerId: existingCustomerId,
    sellerId: overrides.sellerId || "seller-123",
    purchaseAmount: overrides.purchaseAmount ?? 200,
    purchaseDate: overrides.purchaseDate || new Date().toISOString(),
    paymentMethod: overrides.paymentMethod || "PIX",
    state: overrides.state || "SP",
    isFirstPurchase: overrides.isFirstPurchase,
    ...withoutUndefined(overrides.extra || {})
  };
}

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

module.exports = {
  buildCashbackSimulation,
  existingCustomerId
};
