const express = require("express");
const router = express.Router();
const purchaseCtrl = require("../controllers/PurchaseController");
const authController = require("../auth/authController");

router.use(authController.protect);

router.post("/buy/:productId", purchaseCtrl.buyProduct);

module.exports = router;
