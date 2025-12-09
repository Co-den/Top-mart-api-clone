const express = require("express");
const router = express.Router();
const investmentController = require("../controllers/InvestmentController");
const onlyUser = require("../auth/authController");
const onlyAdmin = require("../auth/adminAuthController");
const { processDailyReturns } = require("../utils/investmentCron");

router.get("/", onlyAdmin.protect, investmentController.getAllInvestments);
router.post("/", onlyAdmin.protect, investmentController.createInvestment);
router.get("/:id", onlyUser.protect, investmentController.getUserInvestments);
router.get("/:id", onlyUser.protect, investmentController.getInvestment);
router.put(
  "/:id",
  onlyAdmin.protect,
  investmentController.updateInvestmentStatus
);
router.delete("/:id", onlyAdmin.protect, investmentController.deleteInvestment);
router.post(
  "/cancel/:id",
  onlyUser.protect,
  investmentController.cancelInvestment
);
router.post(
  "/update-status/:id",
  onlyAdmin.protect,
  investmentController.updateInvestmentStatus
);

router.post(
  "/process-returns",
  onlyAdmin.protect,
  async (req, res) => {
    try {
      const result = await processDailyReturns();
      res.status(200).json({
        success: result.success,
        message: "Daily returns processing completed",
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to process daily returns",
        error: error.message,
      });
    }
  }
);

module.exports = router;
