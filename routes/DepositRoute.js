// routes/depositRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const dC = require("../controllers/DepositController");
const adminAuthser = require("../auth/adminAuthController");
const userAuth = require("../auth/authController");
const authController = require("../auth/authController");

// User initiates deposit
router.post("/initiate", userAuth.protect, dC.initializeDeposit);

// User submits proof
router.post(
  "/:depositId/proof",
  userAuth.protect,
  upload.single("file"),
  dC.uploadProof
);

// Get deposit by ID
router.get(
  "/:depositId",
  userAuth.protect,
  authController.restrictTo(["user"]),
  dC.getDeposit
);

// Get all deposits - admin only
router.get(
  "/",
  adminAuthser.protect,
  authController.restrictTo(["admin", "superadmin"]),
  dC.getAllDeposits
);

// Admin approves/rejects
router.patch(
  "/:depositId/approve",
  adminAuthser.protect,
  authController.restrictTo(["admin", "superadmin"]),
  dC.approveDeposit
);
router.patch(
  "/:depositId/reject",
  adminAuthser.protect,
  authController.restrictTo(["admin", "superadmin"]),
  dC.rejectDeposit
);

module.exports = router;
