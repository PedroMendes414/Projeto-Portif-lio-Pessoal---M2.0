const express = require("express");
const { validateUserRegistration } = require("../utils/validators");
const { sendValidationError } = require("../utils/responses");
const { registerUser, findUserById, hideCampaignForUser } = require("../services/userService");
const { requireUser } = require("../middlewares/authMiddleware");
const { listCampaignsForUser, getCampaignById } = require("../services/campaignService");
const { validatePagination } = require("../utils/validators");
const { ensureUuid } = require("../utils/validators");

const router = express.Router();

router.post("/register", (req, res, next) => {
  const errors = validateUserRegistration(req.body);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    return res.status(201).json(registerUser(req.body));
  } catch (error) {
    return next(error);
  }
});

router.get("/me/campaigns", requireUser, (req, res, next) => {
  const errors = validatePagination(req.query);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    const user = findUserById(req.auth.sub);
    return res.status(200).json(listCampaignsForUser(user, req.query));
  } catch (error) {
    return next(error);
  }
});

router.delete("/me/campaigns/:campaignId", requireUser, (req, res, next) => {
  try {
    ensureUuid(req.params.campaignId, "campaignId");
    const user = findUserById(req.auth.sub);
    const campaign = getCampaignById(req.params.campaignId);
    const visibleCampaigns = listCampaignsForUser(user, {});
    const canDelete = visibleCampaigns.content.some((item) => item.id === campaign.id);

    if (!canDelete) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "Perfil sem permissao para excluir esta campanha.",
        timestamp: new Date().toISOString()
      });
    }

    hideCampaignForUser(req.auth.sub, req.params.campaignId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
