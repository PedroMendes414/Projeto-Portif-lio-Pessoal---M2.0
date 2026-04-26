const { randomUUID } = require("crypto");
const { campaigns } = require("../data/store");
const { createError } = require("../utils/errors");

const EDITABLE_STATUSES = new Set(["DRAFT", "SCHEDULED", "PAUSED"]);
const TERMINAL_STATUSES = new Set(["CANCELLED", "ARCHIVED"]);

const ALLOWED_TRANSITIONS = {
  DRAFT: ["SCHEDULED", "ACTIVE", "CANCELLED", "ARCHIVED"],
  SCHEDULED: ["ACTIVE", "PAUSED", "CANCELLED", "ARCHIVED"],
  ACTIVE: ["PAUSED", "CANCELLED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "CANCELLED", "ARCHIVED"],
  EXPIRED: ["ARCHIVED"],
  CANCELLED: [],
  ARCHIVED: []
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function deriveCampaignStatus(campaign, referenceDate = new Date()) {
  const startAt = new Date(campaign.validity.startAt);
  const endAt = new Date(campaign.validity.endAt);
  const current = new Date(referenceDate);

  if (TERMINAL_STATUSES.has(campaign.status) || campaign.status === "DRAFT" || campaign.status === "PAUSED") {
    return campaign.status;
  }
  if (current > endAt) {
    return "EXPIRED";
  }
  if (current < startAt) {
    return "SCHEDULED";
  }
  return "ACTIVE";
}

function refreshCampaignStatus(campaign, referenceDate) {
  const derivedStatus = deriveCampaignStatus(campaign, referenceDate);
  if (campaign.status !== derivedStatus) {
    campaign.status = derivedStatus;
    campaign.updatedAt = new Date().toISOString();
  }
  return campaign;
}

function campaignResponse(campaign, referenceDate) {
  const refreshed = refreshCampaignStatus(campaign, referenceDate);
  return JSON.parse(JSON.stringify(refreshed));
}

function overlaps(first, second) {
  return new Date(first.startAt) < new Date(second.endAt) && new Date(second.startAt) < new Date(first.endAt);
}

function assertNoScopedConflict(candidate, excludedCampaignId) {
  const conflict = campaigns.find((campaign) => {
    if (campaign.id === excludedCampaignId) {
      return false;
    }

    const effectiveStatus = deriveCampaignStatus(campaign);
    if (!["ACTIVE", "SCHEDULED"].includes(effectiveStatus)) {
      return false;
    }

    const sameSeller = (campaign.sellerId || "GLOBAL") === (candidate.sellerId || "GLOBAL");
    return sameSeller && overlaps(campaign.validity, candidate.validity);
  });

  if (conflict) {
    throw createError(409, "CAMPAIGN_SCOPE_CONFLICT", "Ja existe campanha ativa ou agendada para o mesmo escopo e periodo.");
  }
}

function resolveInitialStatus(validity) {
  const now = new Date();
  if (now < new Date(validity.startAt)) {
    return "SCHEDULED";
  }
  if (now > new Date(validity.endAt)) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

function createCampaign(payload, adminUser) {
  const campaign = {
    id: randomUUID(),
    name: normalizeText(payload.name),
    description: normalizeText(payload.description),
    sellerId: normalizeText(payload.sellerId),
    status: resolveInitialStatus(payload.validity),
    validity: {
      startAt: new Date(payload.validity.startAt).toISOString(),
      endAt: new Date(payload.validity.endAt).toISOString()
    },
    cashbackRule: {
      ...payload.cashbackRule,
      currency: payload.cashbackRule.currency.toUpperCase(),
      allowedPaymentMethods: payload.cashbackRule.allowedPaymentMethods || []
    },
    audience: {
      segment: payload.audience.segment || "ALL",
      states: payload.audience.states || [],
      customerIds: payload.audience.customerIds || []
    },
    stackable: payload.stackable ?? false,
    priority: payload.priority ?? 100,
    createdBy: {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  assertNoScopedConflict(campaign);
  campaigns.push(campaign);
  return campaignResponse(campaign);
}

function listCampaigns(filters) {
  const referenceDate = filters.activeAt ? new Date(filters.activeAt) : new Date();
  let content = campaigns.map((campaign) => campaignResponse(campaign, referenceDate));

  if (filters.status) {
    content = content.filter((campaign) => campaign.status === filters.status);
  }
  if (filters.sellerId) {
    content = content.filter((campaign) => campaign.sellerId === filters.sellerId);
  }
  if (filters.activeAt) {
    content = content.filter((campaign) => {
      const activeAt = new Date(filters.activeAt);
      return activeAt >= new Date(campaign.validity.startAt) && activeAt <= new Date(campaign.validity.endAt);
    });
  }

  content.sort((a, b) => a.priority - b.priority || new Date(b.createdAt) - new Date(a.createdAt));

  const page = Number(filters.page ?? 0);
  const size = Number(filters.size ?? 20);
  const totalElements = content.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const start = page * size;

  return {
    content: content.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages
  };
}

function getCampaignById(id) {
  const campaign = campaigns.find((item) => item.id === id);
  if (!campaign) {
    throw createError(404, "CAMPAIGN_NOT_FOUND", "Campanha nao encontrada.");
  }

  return campaignResponse(campaign);
}

function deleteCampaign(id) {
  const index = campaigns.findIndex((item) => item.id === id);
  if (index === -1) {
    throw createError(404, "CAMPAIGN_NOT_FOUND", "Campanha nao encontrada.");
  }

  campaigns.splice(index, 1);
}

function updateCampaign(id, payload) {
  const campaign = campaigns.find((item) => item.id === id);
  if (!campaign) {
    throw createError(404, "CAMPAIGN_NOT_FOUND", "Campanha nao encontrada.");
  }

  refreshCampaignStatus(campaign);
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    throw createError(409, "CAMPAIGN_NOT_EDITABLE", "A campanha nao pode ser alterada no status atual.");
  }

  const nextCampaign = {
    ...campaign,
    ...("name" in payload ? { name: normalizeText(payload.name) } : {}),
    ...("description" in payload ? { description: normalizeText(payload.description) } : {}),
    ...("sellerId" in payload ? { sellerId: normalizeText(payload.sellerId) } : {}),
    ...("validity" in payload
      ? {
          validity: {
            startAt: new Date(payload.validity.startAt).toISOString(),
            endAt: new Date(payload.validity.endAt).toISOString()
          }
        }
      : {}),
    ...("cashbackRule" in payload
      ? {
          cashbackRule: {
            ...payload.cashbackRule,
            currency: payload.cashbackRule.currency.toUpperCase(),
            allowedPaymentMethods: payload.cashbackRule.allowedPaymentMethods || []
          }
        }
      : {}),
    ...("audience" in payload
      ? {
          audience: {
            segment: payload.audience.segment || "ALL",
            states: payload.audience.states || [],
            customerIds: payload.audience.customerIds || []
          }
        }
      : {}),
    ...("stackable" in payload ? { stackable: payload.stackable } : {}),
    ...("priority" in payload ? { priority: payload.priority } : {})
  };

  assertNoScopedConflict(nextCampaign, id);

  Object.assign(campaign, nextCampaign, {
    status: deriveCampaignStatus(nextCampaign),
    updatedAt: new Date().toISOString()
  });

  return campaignResponse(campaign);
}

function changeCampaignStatus(id, nextStatus) {
  const campaign = campaigns.find((item) => item.id === id);
  if (!campaign) {
    throw createError(404, "CAMPAIGN_NOT_FOUND", "Campanha nao encontrada.");
  }

  refreshCampaignStatus(campaign);
  const currentStatus = campaign.status;
  const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw createError(409, "INVALID_STATUS_TRANSITION", `Nao e permitido alterar o status de ${currentStatus} para ${nextStatus}.`);
  }

  if ((nextStatus === "ACTIVE" || nextStatus === "SCHEDULED") && ["ACTIVE", "SCHEDULED"].includes(nextStatus)) {
    assertNoScopedConflict(campaign, id);
  }

  campaign.status = nextStatus;
  campaign.updatedAt = new Date().toISOString();
  return campaignResponse(campaign);
}

function listActiveCampaignsBySeller(sellerId, purchaseDate) {
  return campaigns
    .map((campaign) => campaignResponse(campaign, purchaseDate))
    .filter((campaign) => campaign.sellerId === sellerId && campaign.status === "ACTIVE");
}

function isCampaignVisibleToUser(campaign, user, referenceDate = new Date()) {
  const campaignView = campaignResponse(campaign, referenceDate);
  const { audience } = campaignView;

  if (!["ACTIVE", "SCHEDULED"].includes(campaignView.status)) {
    return false;
  }
  if (audience.states.length > 0 && (!user.state || !audience.states.includes(user.state))) {
    return false;
  }
  if (audience.customerIds.length > 0 && !audience.customerIds.includes(user.id)) {
    return false;
  }

  switch (audience.segment) {
    case "ALL":
      return true;
    case "NEW_USERS":
      return true;
    case "PREMIUM":
      return user.document.endsWith("00");
    case "SELLER_DEFINED":
      return audience.customerIds.includes(user.id);
    default:
      return true;
  }
}

function listCampaignsForUser(user, filters = {}) {
  if (!user) {
    throw createError(404, "USER_NOT_FOUND", "Usuario autenticado nao encontrado.");
  }

  const referenceDate = filters.activeAt ? new Date(filters.activeAt) : new Date();
  const hiddenCampaignIds = user.hiddenCampaignIds || [];
  let content = campaigns
    .filter((campaign) => !hiddenCampaignIds.includes(campaign.id))
    .filter((campaign) => isCampaignVisibleToUser(campaign, user, referenceDate))
    .map((campaign) => campaignResponse(campaign, referenceDate));

  if (filters.status) {
    content = content.filter((campaign) => campaign.status === filters.status);
  }
  if (filters.sellerId) {
    content = content.filter((campaign) => campaign.sellerId === filters.sellerId);
  }

  content.sort((a, b) => a.priority - b.priority || new Date(b.createdAt) - new Date(a.createdAt));

  const page = Number(filters.page ?? 0);
  const size = Number(filters.size ?? 20);
  const totalElements = content.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const start = page * size;

  return {
    content: content.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages
  };
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignById,
  deleteCampaign,
  updateCampaign,
  changeCampaignStatus,
  listActiveCampaignsBySeller,
  listCampaignsForUser
};
