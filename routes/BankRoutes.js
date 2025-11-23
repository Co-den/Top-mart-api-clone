// routes/bankRoutes.js
const express = require("express");
const router = express.Router();
const AuthController = require("../auth/authController");
const bankController = require("../controllers/BankAccountController");

router.use(AuthController.protect);

router.post("/bank-account", bankController.resolveAccount);

module.exports = router;
