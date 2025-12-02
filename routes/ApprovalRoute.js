// routes/paymentProofRoutes.js
const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/ApprovalController");
const adminAuth = require("../auth/adminAuthController");


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
