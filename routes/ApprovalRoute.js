// routes/paymentProofRoutes.js
const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/ApprovalController");
const adminAuth = require("../auth/adminAuthController");

// Admin views all pending proofs
router.get(
  "/pending-users",
  adminAuth.protect,
  approvalController.getAllDeposits
);

router.patch(
  "/:depositId/approve",
  adminAuth.protect,
  approvalController.approveDeposit
);
router.patch(
  "/:depositId/reject",
  adminAuth.protect,
  approvalController.rejectUserDeposit
);

module.exports = router;
