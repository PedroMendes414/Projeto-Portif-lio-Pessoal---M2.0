const { sendError, sendValidationError } = require("../utils/responses");

function notFoundHandler(req, res) {
  return sendError(res, 404, "NOT_FOUND", "Recurso nao encontrado.");
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
    return sendValidationError(res, error.details);
  }

  return sendError(
    res,
    error.status || 500,
    error.code || "INTERNAL_SERVER_ERROR",
    error.message || "Ocorreu um erro interno no servidor.",
    error.details
  );
}

module.exports = {
  notFoundHandler,
  errorHandler
};
