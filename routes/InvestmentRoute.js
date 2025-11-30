const express = require("express");
const router = express.Router();
const investmentController = require("../controllers/InvestmentController");

router.post("/deposit", investmentController.submitDeposit);
router.patch("/:id/approve", investmentController.approveInvestment);
router.patch("/:id/reject", investmentController.rejectInvestment);
router.post("/process-matured", investmentController.processMaturedInvestments);

module.exports = router;
