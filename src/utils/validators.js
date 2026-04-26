const { createError } = require("./errors");

const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "EXPIRED", "CANCELLED", "ARCHIVED"];
const ADMIN_ROLES = ["ADMIN", "MANAGER"];
const USER_ROLES = ["CUSTOMER"];
const PAYMENT_METHODS = ["CREDIT_CARD", "PIX", "BOLETO", "WALLET"];
const AUDIENCE_SEGMENTS = ["ALL", "NEW_USERS", "PREMIUM", "SELLER_DEFINED"];
const CASHBACK_TYPES = ["PERCENTAGE", "FIXED"];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

function isDateString(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isDateOnlyString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value));
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function pushIf(errors, condition, field, message) {
  if (condition) {
    errors.push({ field, message });
  }
}

function validateAdminLogin(body) {
  const errors = [];
  pushIf(errors, !isObject(body), "body", "O corpo da requisicao deve ser um objeto JSON.");
  if (errors.length > 0) {
    return errors;
  }

  pushIf(errors, !isEmail(body.email), "email", "Informe um email valido.");
  pushIf(errors, typeof body.password !== "string" || body.password.length < 8, "password", "A senha deve ter ao menos 8 caracteres.");
  return errors;
}

function validateUserLogin(body) {
  const errors = [];
  pushIf(errors, !isObject(body), "body", "O corpo da requisicao deve ser um objeto JSON.");
  if (errors.length > 0) {
    return errors;
  }

  pushIf(errors, !isEmail(body.email), "email", "Informe um email valido.");
  pushIf(errors, typeof body.password !== "string" || body.password.length < 8, "password", "A senha deve ter ao menos 8 caracteres.");
  return errors;
}

function validateUserRegistration(body) {
  const errors = [];
  pushIf(errors, !isObject(body), "body", "O corpo da requisicao deve ser um objeto JSON.");
  if (errors.length > 0) {
    return errors;
  }

  pushIf(errors, typeof body.fullName !== "string" || body.fullName.trim().length < 3 || body.fullName.trim().length > 120, "fullName", "O nome completo deve ter entre 3 e 120 caracteres.");
  pushIf(errors, !isEmail(body.email), "email", "Informe um email valido.");
  pushIf(errors, !/^\d{11}$/.test(body.document || ""), "document", "O documento deve conter 11 digitos numericos.");
  pushIf(errors, typeof body.password !== "string" || body.password.length < 8, "password", "A senha deve ter ao menos 8 caracteres.");
  pushIf(errors, body.phone !== undefined && !/^\d{10,11}$/.test(body.phone), "phone", "O telefone deve conter 10 ou 11 digitos numericos.");
  pushIf(errors, body.birthDate !== undefined && !isDateOnlyString(body.birthDate), "birthDate", "A data de nascimento deve estar no formato YYYY-MM-DD.");
  pushIf(errors, body.state !== undefined && !/^[A-Z]{2}$/.test(body.state), "state", "O estado deve possuir duas letras maiusculas.");
  return errors;
}

function validateCampaignValidity(validity, prefix = "validity") {
  const errors = [];
  if (!isObject(validity)) {
    errors.push({ field: prefix, message: "O periodo de vigencia deve ser um objeto." });
    return errors;
  }

  pushIf(errors, !isDateString(validity.startAt), `${prefix}.startAt`, "Informe uma data inicial valida.");
  pushIf(errors, !isDateString(validity.endAt), `${prefix}.endAt`, "Informe uma data final valida.");
  if (isDateString(validity.startAt) && isDateString(validity.endAt) && new Date(validity.endAt) <= new Date(validity.startAt)) {
    errors.push({ field: prefix, message: "A data final deve ser maior que a data inicial." });
  }

  return errors;
}

function validateCashbackRule(rule, prefix = "cashbackRule") {
  const errors = [];
  if (!isObject(rule)) {
    errors.push({ field: prefix, message: "A regra de cashback deve ser um objeto." });
    return errors;
  }

  pushIf(errors, !CASHBACK_TYPES.includes(rule.type), `${prefix}.type`, "O tipo deve ser PERCENTAGE ou FIXED.");
  pushIf(errors, !isPositiveNumber(rule.value), `${prefix}.value`, "O valor deve ser maior que zero.");
  pushIf(errors, typeof rule.currency !== "string" || rule.currency.trim().length !== 3, `${prefix}.currency`, "A moeda deve ter 3 caracteres.");
  pushIf(errors, rule.minPurchaseAmount !== undefined && !isNonNegativeNumber(rule.minPurchaseAmount), `${prefix}.minPurchaseAmount`, "O valor minimo da compra deve ser maior ou igual a zero.");
  pushIf(errors, rule.maxCashbackAmount !== undefined && !isNonNegativeNumber(rule.maxCashbackAmount), `${prefix}.maxCashbackAmount`, "O valor maximo de cashback deve ser maior ou igual a zero.");
  pushIf(errors, rule.firstPurchaseOnly !== undefined && typeof rule.firstPurchaseOnly !== "boolean", `${prefix}.firstPurchaseOnly`, "O campo deve ser booleano.");
  pushIf(errors, rule.allowedPaymentMethods !== undefined && (!Array.isArray(rule.allowedPaymentMethods) || rule.allowedPaymentMethods.some((method) => !PAYMENT_METHODS.includes(method))), `${prefix}.allowedPaymentMethods`, "Informe apenas meios de pagamento permitidos.");

  return errors;
}

function validateAudience(audience, prefix = "audience") {
  const errors = [];
  if (!isObject(audience)) {
    errors.push({ field: prefix, message: "A audiencia deve ser um objeto." });
    return errors;
  }

  pushIf(errors, audience.segment !== undefined && !AUDIENCE_SEGMENTS.includes(audience.segment), `${prefix}.segment`, "O segmento informado nao e suportado.");
  pushIf(errors, audience.states !== undefined && (!Array.isArray(audience.states) || audience.states.some((state) => !/^[A-Z]{2}$/.test(state))), `${prefix}.states`, "Informe estados validos com duas letras maiusculas.");
  pushIf(errors, audience.customerIds !== undefined && (!Array.isArray(audience.customerIds) || audience.customerIds.some((id) => !isUuid(id))), `${prefix}.customerIds`, "Informe apenas IDs de cliente validos.");

  return errors;
}

function validateCampaignUpsert(body, { partial = false } = {}) {
  const errors = [];
  pushIf(errors, !isObject(body), "body", "O corpo da requisicao deve ser um objeto JSON.");
  if (errors.length > 0) {
    return errors;
  }

  const requiredFields = ["name", "description", "validity", "cashbackRule", "audience"];
  if (!partial) {
    requiredFields.forEach((field) => {
      if (body[field] === undefined) {
        errors.push({ field, message: "Campo obrigatorio." });
      }
    });
  }

  if (body.name !== undefined) {
    pushIf(errors, typeof body.name !== "string" || body.name.trim().length < 3 || body.name.trim().length > 120, "name", "O nome deve ter entre 3 e 120 caracteres.");
  }
  if (body.description !== undefined) {
    pushIf(errors, typeof body.description !== "string" || body.description.trim().length < 10 || body.description.trim().length > 1000, "description", "A descricao deve ter entre 10 e 1000 caracteres.");
  }
  if (body.sellerId !== undefined) {
    pushIf(errors, !isNonEmptyString(body.sellerId), "sellerId", "Informe um sellerId valido.");
  }
  if (body.stackable !== undefined) {
    pushIf(errors, typeof body.stackable !== "boolean", "stackable", "O campo deve ser booleano.");
  }
  if (body.priority !== undefined) {
    pushIf(errors, !Number.isInteger(body.priority) || body.priority < 1 || body.priority > 999, "priority", "A prioridade deve ser um inteiro entre 1 e 999.");
  }
  if (body.validity !== undefined) {
    errors.push(...validateCampaignValidity(body.validity));
  }
  if (body.cashbackRule !== undefined) {
    errors.push(...validateCashbackRule(body.cashbackRule));
  }
  if (body.audience !== undefined) {
    errors.push(...validateAudience(body.audience));
  }

  return errors;
}

function validateCampaignStatusChange(body) {
  const errors = [];
  pushIf(errors, !isObject(body), "body", "O corpo da requisicao deve ser um objeto JSON.");
  if (errors.length > 0) {
    return errors;
  }

  pushIf(errors, !CAMPAIGN_STATUSES.includes(body.status), "status", "Informe um status valido.");
  pushIf(errors, body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 255), "reason", "O motivo deve ter no maximo 255 caracteres.");
  return errors;
}

function validateSimulation(body) {
  const errors = [];
  pushIf(errors, !isObject(body), "body", "O corpo da requisicao deve ser um objeto JSON.");
  if (errors.length > 0) {
    return errors;
  }

  pushIf(errors, !isUuid(body.customerId), "customerId", "Informe um customerId valido.");
  pushIf(errors, !isNonEmptyString(body.sellerId), "sellerId", "Informe um sellerId valido.");
  pushIf(errors, !isPositiveNumber(body.purchaseAmount), "purchaseAmount", "O valor da compra deve ser maior que zero.");
  pushIf(errors, !isDateString(body.purchaseDate), "purchaseDate", "Informe uma data de compra valida.");
  pushIf(errors, !PAYMENT_METHODS.includes(body.paymentMethod), "paymentMethod", "Informe um meio de pagamento valido.");
  pushIf(errors, body.isFirstPurchase !== undefined && typeof body.isFirstPurchase !== "boolean", "isFirstPurchase", "O campo deve ser booleano.");
  pushIf(errors, body.state !== undefined && !/^[A-Z]{2}$/.test(body.state), "state", "O estado deve possuir duas letras maiusculas.");
  return errors;
}

function validatePagination(query) {
  const errors = [];
  if (query.page !== undefined) {
    const page = Number(query.page);
    pushIf(errors, !Number.isInteger(page) || page < 0, "page", "A pagina deve ser um inteiro maior ou igual a zero.");
  }
  if (query.size !== undefined) {
    const size = Number(query.size);
    pushIf(errors, !Number.isInteger(size) || size < 1 || size > 100, "size", "O tamanho da pagina deve ser um inteiro entre 1 e 100.");
  }
  if (query.status !== undefined) {
    pushIf(errors, !CAMPAIGN_STATUSES.includes(query.status), "status", "Informe um status valido.");
  }
  if (query.activeAt !== undefined) {
    pushIf(errors, !isDateString(query.activeAt), "activeAt", "Informe uma data valida para activeAt.");
  }
  return errors;
}

function ensureUuid(value, field = "id") {
  if (!isUuid(value)) {
    throw createError(422, "VALIDATION_ERROR", "Parametro invalido.", [{ field, message: "Informe um UUID valido." }]);
  }
}

module.exports = {
  ADMIN_ROLES,
  AUDIENCE_SEGMENTS,
  CAMPAIGN_STATUSES,
  PAYMENT_METHODS,
  validateAdminLogin,
  validateUserLogin,
  validateUserRegistration,
  validateCampaignUpsert,
  validateCampaignStatusChange,
  validateSimulation,
  validatePagination,
  ensureUuid,
  isUuid,
  USER_ROLES
};
