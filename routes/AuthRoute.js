const express = require("express");
const router = express.Router();
const AuthController = require("../auth/authController");
const v = require("../controllers/ValidationController");

// User registration
router.post("/register", v.registerValidator, AuthController.register);
// User login
router.post("/login", v.loginValidator, AuthController.login);
// User logout
router.post("/logout", AuthController.logout);

// Update password
router.post(
  "/updatePassword",
  AuthController.updatePassword
);

module.exports = router;
