const express = require("express");
const router = express.Router();
const investmentController = require("../controllers/InvestmentController");
const onlyAdmin = require("../auth/adminAuthController");
const onlyUser = require("../auth/authController");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

// =================================================================
// USER ROUTES - Require authentication
// =================================================================

// Create new investment
router.post("/", onlyUser.protect, investmentController.createInvestment);

// Get current user's investments
router.get(
  "/my-investments",
  onlyUser.protect,
  investmentController.getUserInvestments
);

// Get single investment by ID
router.get("/:id", onlyUser.protect, investmentController.getInvestment);

// Cancel investment (user can cancel their own)
router.put(
  "/:id/cancel",
  onlyUser.protect,
  investmentController.cancelInvestment
);

// =================================================================
// ADMIN ROUTES - Require admin role
// =================================================================

// Get all investments (with pagination and filters)
router.get(
  "/",
  onlyAdmin.protect,
  onlyAdmin.authorize("admin"),
  investmentController.getAllInvestments
);

// Update investment status
router.put(
  "/:id/status",
  onlyAdmin.protect,
  onlyAdmin.authorize("admin"),
  investmentController.updateInvestmentStatus
);

// Delete investment
router.delete(
  "/:id",
  onlyAdmin.protect,
  onlyAdmin.authorize("admin"),
  investmentController.deleteInvestment
);

// Get investment statistics
router.get(
  "/stats/overview",
  onlyAdmin.protect,
  onlyAdmin.authorize("admin"),
  investmentController.getInvestmentStats
);

// =================================================================
// AUTOMATION ROUTES - Admin only
// =================================================================

// Manually trigger daily returns processing
router.post(
  "/process-returns",
  onlyAdmin.protect,
  onlyAdmin.authorize("admin"),
  investmentController.processDailyReturns
);

// Catch up missed returns (for investments that missed daily credits)
router.post(
  "/catch-up-returns",
  onlyAdmin.protect,
  onlyAdmin.authorize("admin"),
  investmentController.catchUpMissedReturns
);

router.post(
  "/cron-trigger",
  investmentController.cronTrigger
);

module.exports = router;
