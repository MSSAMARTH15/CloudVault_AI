const express = require("express");

const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  updateUsername,
  updatePassword,
  deleteAccount,
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
router.put("/username", verifyToken, updateUsername);
router.put("/password", verifyToken, updatePassword);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.delete("/account", verifyToken, deleteAccount);
module.exports = router;