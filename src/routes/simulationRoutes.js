const express = require("express");
const { validateSimulation } = require("../utils/validators");
const { sendValidationError } = require("../utils/responses");
const { simulateCashback } = require("../services/simulationService");

const router = express.Router();

router.post("/cashback", (req, res, next) => {
  const errors = validateSimulation(req.body);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    return res.status(200).json(simulateCashback(req.body));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
