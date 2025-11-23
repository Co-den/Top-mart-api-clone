// routes/bankRoutes.js
const express = require("express");
const router = express.Router();
const { setBankAccount } = require("../controllers/bankController");
const AuthController = require("../middleware/authMiddleware");
const { resolveAccount } = require("../controllers/BankAccountController");

router.use(AuthController.protect);

router.post("/bank-account", setBankAccount);
router.put("/setbank", resolveAccount);

module.exports = router;
