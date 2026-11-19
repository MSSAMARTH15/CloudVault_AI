
const express = require("express");
const router = express.Router();

const verifyToken =
  require("../middleware/authMiddleware");

const {
  getRecoveryStatus,
} = require("../controllers/recoveryController");

router.get(
  "/status",
  verifyToken,
  getRecoveryStatus
);

module.exports = router;
