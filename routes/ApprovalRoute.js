// routes/paymentProofRoutes.js
const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/ApprovalController");
const adminAuth = require("../auth/adminAuthController");



// Admin views all pending proofs
router.get(
  "/pending-users",
  adminAuth.protect,
  approvalController.getPendingUsers
);

// Admin approves a user’s proof
router.patch(
  "/:userId/approve",
  adminAuth.protect,
  approvalController.approveUser
);

// Admin rejects a user’s proof
router.patch(
  "/:userId/reject",
  adminAuth.protect,
  approvalController.rejectUser
);

module.exports = router;
