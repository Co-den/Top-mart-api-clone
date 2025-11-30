// routes/depositRoutes.js
const express = require("express");
const router = express.Router();
const dC = require("../controllers/DepositController");
const adminAuthser = require("../auth/adminAuthController");
const userAuth = require("../auth/authController");

// User initiates deposit
router.post("/initiate", userAuth.protect, dC.initializeDeposit);
// User submits proof
router.post("/:depositId/proof", userAuth.protect, dC.submitProof);

// Get deposit by ID
router.get("/:depositId", userAuth.protect, dC.getDeposit);

// Admin approves/rejects
router.patch("/:depositId/approve", adminAuthser.protect, dC.approveDeposit);
router.patch("/:depositId/reject", adminAuthser.protect, dC.rejectDeposit);

module.exports = router;
