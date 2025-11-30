const express = require("express");
const router = express.Router();
const adminController = require("../controllers/AdminController");
const authAdmin = require("../auth/adminAuthController");

// Auth
router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);
router.post("/logout", authAdmin.protect, adminController.logoutAdmin);
router.get("/verify", adminController.verifyAdmin);

module.exports = router;
