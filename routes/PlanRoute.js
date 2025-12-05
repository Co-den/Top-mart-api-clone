const express = require("express");
const router = express.Router();
const planCtrl = require("../controllers/PlansController");
const AuthController = require("../auth/authController");
const authAdmin = require("../auth/adminAuthController");

router.post("/", authAdmin.protect, planCtrl.createPlan);
router.get("/", authAdmin.protect, planCtrl.getPlans);
router.post("/:planId", AuthController.protect, planCtrl.buyPlan);

module.exports = router;
