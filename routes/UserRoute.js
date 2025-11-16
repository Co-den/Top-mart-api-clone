const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const v = require("../controllers/ValidationController");

// Get user profile
router.get("/profile/:id", UserController.getProfile);
// Update user profile
router.put("/profile/:id", UserController.updateProfile);
// Delete user account
router.delete("/profile/:id", UserController.deleteAccount);

module.exports = router;
