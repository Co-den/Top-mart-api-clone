const express = require("express");
const router = express.Router();
const referralController = require("../controllers/ReferralController");
const adminAuth = require("../auth/adminAuthController");
const userAuth = require("../auth/authController");

// Public route - validate referral code (no auth needed)
router.get("/validate/:code", referralController.validateReferralCode);

// User routes
router.get(
  "/my-referrals",
  userAuth.protect,
  userAuth.authorize,
  referralController.getReferralInfo
);
router.post(
  "/withdraw-bonus",
  userAuth.protect,
  userAuth.authorize,
  referralController.withdrawReferralBonus
);

// Admin routes
router.get("/stats", adminAuth.authorize, referralController.getReferralStats);

module.exports = router;
