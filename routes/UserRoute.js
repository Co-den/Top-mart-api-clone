const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const AuthController = require("../auth/authController");

router.use(AuthController.protect);

// Get user profile
router.get("/me", UserController.getCurrentUser);
// Get all users
router.get("/", UserController.getAllUsers);
// Update user profile
router.put("/:id", UserController.updateUserProfile);
// Delete user account
router.delete("/:id", UserController.deleteUserAccount);
module.exports = router;
// Get user by ID