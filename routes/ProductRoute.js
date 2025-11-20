const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/ProductController");
const AuthController = require("../auth/authController");


router.post("/", AuthController.protect, productCtrl.createProduct);
router.get("/", productCtrl.getProducts);

module.exports = router;
