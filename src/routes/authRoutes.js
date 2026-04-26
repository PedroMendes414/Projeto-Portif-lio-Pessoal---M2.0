const express = require("express");
const { authenticateAdmin, authenticateUser } = require("../services/authService");
const { validateAdminLogin, validateUserLogin } = require("../utils/validators");
const { sendValidationError } = require("../utils/responses");

const router = express.Router();

router.post("/admin/login", (req, res, next) => {
  const errors = validateAdminLogin(req.body);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    return res.status(200).json(authenticateAdmin(req.body.email, req.body.password));
  } catch (error) {
    return next(error);
  }
});

router.post("/user/login", (req, res, next) => {
  const errors = validateUserLogin(req.body);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    return res.status(200).json(authenticateUser(req.body.email, req.body.password));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
