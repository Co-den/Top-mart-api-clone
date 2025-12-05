const express = require("express");
const router = express.Router();
const planCtrl = require("../controllers/PlansController");
const AuthController = require("../auth/authController");
const authAdmin = require("../auth/adminAuthController");

router.post("/create", authAdmin.protect, planCtrl.createPlan);
router.get("/", planCtrl.getPlans);
router.post("/:planId", AuthController.protect, planCtrl.buyPlan);

module.exports = router;
