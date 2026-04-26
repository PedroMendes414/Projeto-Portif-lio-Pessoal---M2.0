const jwt = require("jsonwebtoken");
const { jwtSecret, tokenExpiresInSeconds } = require("../config");
const { admins } = require("../data/store");
const { createError } = require("../utils/errors");
const { findUserByEmail, sanitizeUser } = require("./userService");

function buildTokenResponse(identity, principal) {
  const accessToken = jwt.sign(identity, jwtSecret, {
    expiresIn: tokenExpiresInSeconds
  });

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: tokenExpiresInSeconds,
    user: principal
  };
}

function authenticateAdmin(email, password) {
  const admin = admins.find((item) => item.email.toLowerCase() === String(email).toLowerCase());
  if (!admin || admin.password !== password) {
    throw createError(401, "INVALID_CREDENTIALS", "Credenciais invalidas.");
  }

  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role
  };

  return buildTokenResponse(payload, {
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    }
  }.user);
}

function authenticateUser(email, password) {
  const user = findUserByEmail(email);
  if (!user || user.password !== password || user.status !== "ACTIVE") {
    throw createError(401, "INVALID_CREDENTIALS", "Credenciais invalidas.");
  }

  return buildTokenResponse(
    {
      sub: user.id,
      email: user.email,
      role: "CUSTOMER"
    },
    {
      ...sanitizeUser(user),
      role: "CUSTOMER"
    }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    throw createError(401, "INVALID_TOKEN", "Credenciais invalidas ou token ausente.");
  }
}

module.exports = {
  authenticateAdmin,
  authenticateUser,
  verifyToken
};
