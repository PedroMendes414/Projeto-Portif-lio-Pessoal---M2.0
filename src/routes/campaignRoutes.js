const express = require("express");
const { requireAdmin } = require("../middlewares/authMiddleware");
const { sendValidationError } = require("../utils/responses");
const {
  validateCampaignUpsert,
  validateCampaignStatusChange,
  validatePagination,
  ensureUuid
} = require("../utils/validators");
const {
  createCampaign,
  listCampaigns,
  getCampaignById,
  deleteCampaign,
  updateCampaign,
  changeCampaignStatus
} = require("../services/campaignService");

const router = express.Router();

router.use(requireAdmin);

router.get("/", (req, res, next) => {
  const errors = validatePagination(req.query);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    return res.status(200).json(listCampaigns(req.query));
  } catch (error) {
    return next(error);
  }
});

router.post("/", (req, res, next) => {
  const errors = validateCampaignUpsert(req.body);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    return res.status(201).json(
      createCampaign(req.body, {
        id: req.auth.sub,
        name: "Gestor autenticado",
        email: req.auth.email,
        role: req.auth.role
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/:campaignId", (req, res, next) => {
  try {
    ensureUuid(req.params.campaignId, "campaignId");
    return res.status(200).json(getCampaignById(req.params.campaignId));
  } catch (error) {
    return next(error);
  }
});

router.delete("/:campaignId", (req, res, next) => {
  try {
    ensureUuid(req.params.campaignId, "campaignId");
    deleteCampaign(req.params.campaignId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.put("/:campaignId", (req, res, next) => {
  const errors = validateCampaignUpsert(req.body, { partial: true });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    ensureUuid(req.params.campaignId, "campaignId");
    return res.status(200).json(updateCampaign(req.params.campaignId, req.body));
  } catch (error) {
    return next(error);
  }
});

router.patch("/:campaignId/status", (req, res, next) => {
  const errors = validateCampaignStatusChange(req.body);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    ensureUuid(req.params.campaignId, "campaignId");
    return res.status(200).json(changeCampaignStatus(req.params.campaignId, req.body.status));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
