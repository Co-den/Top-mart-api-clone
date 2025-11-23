const express = require("express");
const router = express.Router();
const WithdrawController = require("../controllers/WithdrawController");
const AuthController = require("../auth/authController");


router.use(AuthController.protect);
router.post("/withdraw", WithdrawController.withdrawFunds);

module.exports = router;
