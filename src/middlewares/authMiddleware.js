const { ADMIN_ROLES, USER_ROLES } = require("../utils/validators");
const { verifyToken } = require("../services/authService");
const { sendError } = require("../utils/responses");

function authenticateRequest(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [, token] = authorization.split(" ");

  if (!authorization.startsWith("Bearer ") || !token) {
    return sendError(res, 401, "INVALID_TOKEN", "Credenciais invalidas ou token ausente.");
  }

  try {
    const payload = verifyToken(token);
    req.auth = payload;
    return next();
  } catch (error) {
    return sendError(res, error.status || 401, error.code || "INVALID_TOKEN", error.message);
  }
}

function requireAdmin(req, res, next) {
  return authenticateRequest(req, res, () => {
    if (!ADMIN_ROLES.includes(req.auth.role)) {
      return sendError(res, 403, "FORBIDDEN", "Perfil sem permissao para executar a operacao.");
    }
    return next();
  });
}

function requireUser(req, res, next) {
  return authenticateRequest(req, res, () => {
    if (!USER_ROLES.includes(req.auth.role)) {
      return sendError(res, 403, "FORBIDDEN", "Perfil sem permissao para executar a operacao.");
    }
    return next();
  });
}

module.exports = {
  authenticateRequest,
  requireAdmin,
  requireUser
};
