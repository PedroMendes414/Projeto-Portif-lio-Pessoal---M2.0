const { randomUUID } = require("crypto");
const { users } = require("../data/store");
const { createError } = require("../utils/errors");

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    document: user.document,
    state: user.state,
    status: user.status,
    createdAt: user.createdAt
  };
}

function registerUser(payload) {
  const emailInUse = users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase());
  const documentInUse = users.some((user) => user.document === payload.document);

  if (emailInUse || documentInUse) {
    throw createError(409, "USER_ALREADY_EXISTS", "Email ou documento ja cadastrado.");
  }

  const user = {
    id: randomUUID(),
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    document: payload.document,
    password: payload.password,
    phone: payload.phone,
    birthDate: payload.birthDate,
    status: "ACTIVE",
    state: payload.state,
    hiddenCampaignIds: [],
    createdAt: new Date().toISOString()
  };

  users.push(user);
  return sanitizeUser(user);
}

function findUserById(id) {
  return users.find((user) => user.id === id);
}

function findUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
}

function hideCampaignForUser(userId, campaignId) {
  const user = findUserById(userId);
  if (!user) {
    throw createError(404, "USER_NOT_FOUND", "Usuario autenticado nao encontrado.");
  }

  user.hiddenCampaignIds = user.hiddenCampaignIds || [];
  if (!user.hiddenCampaignIds.includes(campaignId)) {
    user.hiddenCampaignIds.push(campaignId);
  }

  return user;
}

module.exports = {
  registerUser,
  findUserById,
  findUserByEmail,
  sanitizeUser,
  hideCampaignForUser
};
