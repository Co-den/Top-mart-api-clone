const express = require("express");
const router = express.Router();
const planCtrl = require("../controllers/PlansController");
const AuthController = require("../auth/authController");


router.post("/", AuthController.protect, planCtrl.createPlan);
router.get("/", planCtrl.getPlans);
router.post("/buy", AuthController.protect, planCtrl.buyPlan);

module.exports = router;
