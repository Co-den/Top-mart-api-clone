const express = require("express");
const router = express.Router();
const depositController = require("../controllers/DepositController");
const withdrawalController = require("../controllers/WithdrawalController");
const authController = require("../auth/authController");

// Apply authentication middleware to all transaction routes
router.use(authController.protect);

router.post("/deposit", depositController.initializeDeposit);
router.get("/deposit/verify", depositController.verifyDeposit);

router.post("/withdraw", withdrawalController.withdrawFunds);

module.exports = router;
