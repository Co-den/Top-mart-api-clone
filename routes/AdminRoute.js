const express = require("express");
const router = express.Router();
const adminController = require("../controllers/AdminController");
const authAdmin = require("../auth/adminAuthController");
const authController = require("../auth/authController");

// Auth
router.post("/login", adminController.loginAdmin);
router.post("/logout", authAdmin.protect, adminController.logoutAdmin);
router.get("/verify", adminController.verifyAdmin);

// Only superadmins can promote users to admin
router.patch(
  "/users/:id/make-admin",
  authAdmin.protect,
  authController.restrictTo("superadmin"),
  adminController.makeAdmin
);
module.exports = router;
