module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "cashback-marketplace-secret",
  tokenExpiresInSeconds: 3600
};
