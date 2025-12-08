const express = require("express");
const router = express.Router();
const investmentController = require("../controllers/InvestmentController");
const onlyUser = require("../auth/authController");
const onlyAdmin = require("../auth/adminAuthController");

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

module.exports = router;
