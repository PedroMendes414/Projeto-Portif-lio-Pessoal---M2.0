function timestamp() {
  return new Date().toISOString();
}

function sendError(res, status, code, message, details) {
  return res.status(status).json({
    code,
    message,
    ...(details ? { details } : {}),
    timestamp: timestamp()
  });
}

function sendValidationError(res, fieldErrors) {
  return res.status(422).json({
    code: "VALIDATION_ERROR",
    message: "A requisicao contem campos invalidos.",
    fieldErrors,
    timestamp: timestamp()
  });
}

module.exports = {
  sendError,
  sendValidationError
};
