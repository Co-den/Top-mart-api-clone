const express = require("express");
const router = express.Router();
const AuthController = require("../auth/AuthController");
const TransRecordController = require("../controllers/TransRecordController");

// Protect all routes after this middleware
router.use(AuthController.protect);

router.get("/records", TransRecordController.getRecords);

module.exports = router;
