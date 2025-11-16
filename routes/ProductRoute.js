const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/ProductController");
const authController = require("../auth/authController");

router.use(authController.protect);

router.post("/", productCtrl.createProduct);
router.get("/", productCtrl.getProducts);

module.exports = router;
