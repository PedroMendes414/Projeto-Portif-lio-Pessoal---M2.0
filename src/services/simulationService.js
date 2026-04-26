const { listActiveCampaignsBySeller } = require("./campaignService");
const { findUserById } = require("./userService");
const { createError } = require("../utils/errors");

function isAudienceEligible(campaign, customer, input) {
  const { audience } = campaign;

  if (audience.states.length > 0 && (!input.state || !audience.states.includes(input.state))) {
    return false;
  }

  if (audience.customerIds.length > 0 && !audience.customerIds.includes(customer.id)) {
    return false;
  }

  switch (audience.segment) {
    case "ALL":
      return true;
    case "NEW_USERS":
      return Boolean(input.isFirstPurchase);
    case "PREMIUM":
      return customer.document.endsWith("00");
    case "SELLER_DEFINED":
      return audience.customerIds.includes(customer.id);
    default:
      return true;
  }
}

function isRuleEligible(campaign, input) {
  const rule = campaign.cashbackRule;

  if (rule.minPurchaseAmount !== undefined && input.purchaseAmount < rule.minPurchaseAmount) {
    return false;
  }
  if (rule.firstPurchaseOnly && !input.isFirstPurchase) {
    return false;
  }
  if (rule.allowedPaymentMethods.length > 0 && !rule.allowedPaymentMethods.includes(input.paymentMethod)) {
    return false;
  }

  return true;
}

function calculateCampaignCashback(campaign, purchaseAmount) {
  const rule = campaign.cashbackRule;
  let cashbackAmount = rule.type === "PERCENTAGE" ? (purchaseAmount * rule.value) / 100 : rule.value;

  if (rule.maxCashbackAmount !== undefined) {
    cashbackAmount = Math.min(cashbackAmount, rule.maxCashbackAmount);
  }

  return Number(cashbackAmount.toFixed(2));
}

function selectCampaigns(eligibleCampaigns) {
  const sorted = [...eligibleCampaigns].sort((a, b) => a.priority - b.priority);
  if (sorted.length === 0) {
    return [];
  }

  if (sorted.some((campaign) => !campaign.stackable)) {
    return [sorted[0]];
  }

  return sorted;
}

function simulateCashback(input) {
  const customer = findUserById(input.customerId);
  if (!customer) {
    throw createError(404, "CUSTOMER_NOT_FOUND", "Cliente nao encontrado para simulacao.");
  }

  const purchaseDate = new Date(input.purchaseDate);
  const campaigns = listActiveCampaignsBySeller(input.sellerId, purchaseDate);

  const eligibleCampaigns = campaigns.filter((campaign) => isAudienceEligible(campaign, customer, input) && isRuleEligible(campaign, input));
  if (eligibleCampaigns.length === 0) {
    throw createError(404, "NO_ELIGIBLE_CAMPAIGN", "Nenhuma campanha elegivel encontrada para o contexto informado.");
  }

  const appliedCampaigns = selectCampaigns(eligibleCampaigns).map((campaign) => ({
    campaignId: campaign.id,
    campaignName: campaign.name,
    cashbackAmount: calculateCampaignCashback(campaign, input.purchaseAmount),
    currency: campaign.cashbackRule.currency
  }));

  const cashbackAmount = appliedCampaigns.reduce((total, item) => total + item.cashbackAmount, 0);

  return {
    eligible: true,
    purchaseAmount: Number(input.purchaseAmount.toFixed(2)),
    cashbackAmount: Number(cashbackAmount.toFixed(2)),
    currency: appliedCampaigns[0]?.currency || "BRL",
    appliedCampaigns: appliedCampaigns.map(({ currency, ...campaign }) => campaign),
    deniedReasons: [],
    processedAt: new Date().toISOString()
  };
}

module.exports = {
  simulateCashback
};
