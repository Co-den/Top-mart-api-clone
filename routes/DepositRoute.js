// routes/depositRoutes.js
const express = require("express");
const router = express.Router();
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");
const multer = require("multer");
const dC = require("../controllers/DepositController");
const adminAuthser = require("../auth/adminAuthController");
const userAuth = require("../auth/authController");
const authController = require("../auth/authController");

//multer configuration for file uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "deposit-proofs",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    resource_type: "auto",
    public_id: (req, file) => {
      // Generate unique filename
      return `proof-${Date.now()}-${file.originalname.split(".")[0]}`;
    },
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// User initiates deposit
router.post("/initiate", userAuth.protect, dC.initializeDeposit);

// User submits proof of payment
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

router.get("/suggested-amounts", userAuth.protect, dC.getSuggestedAmounts);

module.exports = router;
