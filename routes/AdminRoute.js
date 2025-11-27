const express = require("express");
const router = express.Router();
const adminController = require("../controllers/AdminController");
const adminApproval = require("../controllers/ApprovalController");
const authAdmin = require("../auth/adminAuthController");



// Auth
router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);
router.post("/logout",authAdmin.protect, adminController.logoutAdmin);
router.get("/verify", adminController.verifyAdmin);

// Approvals
router.get(
  "/pending-users",
  authAdmin.protect,
  adminApproval.getPendingUsers
);
router.post(
  "/approve/:userId",
  authAdmin.protect,
  adminApproval.approveUser
);
router.post(
  "/reject/:userId",
  authAdmin.protect,
  adminApproval.rejectUser
);

module.exports = router;
