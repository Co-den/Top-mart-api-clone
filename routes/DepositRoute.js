// routes/depositRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const dC = require("../controllers/DepositController");
const adminAuthser = require("../auth/adminAuthController");
const userAuth = require("../auth/authController");
const authController = require("../auth/authController");

//multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/proofs/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// User initiates deposit
router.post("/initiate", userAuth.protect, dC.initializeDeposit);

// User submits proof
router.post(
  "/:depositId/proof",
  userAuth.protect,
  upload.single("proof"),
  dC.uploadProof
);

// Get deposit by ID
router.get("/:depositId", userAuth.protect, dC.getDeposit);

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
  userAuth.restrictTo(["admin", "superadmin"]),
  dC.approveDeposit
);
router.patch(
  "/:depositId/reject",
  adminAuthser.protect,
  userAuth.restrictTo(["admin", "superadmin"]),
  dC.rejectDeposit
);

router.get(
  "/user-deposits",
  userAuth.protect,
  userAuth.restrictTo("user"),
  dC.getDeposits
);
module.exports = router;
