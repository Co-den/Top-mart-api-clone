// routes/bankRoutes.js
const express = require("express");
const router = express.Router();
const { setBankAccount } = require("../controllers/bankController");
const AuthController = require("../middleware/authMiddleware");

router.use(AuthController.protect);

router.post("/bank-account", setBankAccount);
router.put("/bank-account", updateBankDetails);

module.exports = router;
