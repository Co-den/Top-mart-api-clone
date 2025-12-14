const express = require("express");
const router = express.Router();
const WithdrawController = require("../controllers/WithdrawalController");
const userAuth = require("../auth/authController");

router.use(userAuth.protect);
router.post("/withdraw", WithdrawController.withdrawFunds);
router.get(
  "/user-withdrawals",
  userAuth.restrictTo("user"),
  WithdrawController.getWithdrawals
);

module.exports = router;
