const express = require("express");

const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser
} = require("../controllers/authController");

router.get("/test", (req, res) => {
  res.json({
    message: "Auth Route Working",
  });
});

router.get(
  "/profile",
  verifyToken,
  (req, res) => {
    res.json({
      message: "Protected Route Accessed",
      user: req.user,
    });
  }
);

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;