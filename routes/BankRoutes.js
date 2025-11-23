const express = require("express");
const router = express.Router();
const AuthController = require("../auth/authController");
const bankController = require("../controllers/BankAccountController");

router.use(AuthController.protect);

router.post("/bank-account", bankController.resolveAccount);
router.get("/banks", bankController.getBanks);
router.post("/update-account", bankController.updateBankDetails);

module.exports = router;
