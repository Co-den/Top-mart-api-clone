const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const AuthController = require("../auth/authController");

router.use(AuthController.protect);

// Get user profile
router.get("/me", UserController.getCurrentUser);
// Get all users
router.get("/", UserController.getAllUsers);
// Get user by ID
router.get("/:id/user", UserController.getUserById);
// Update user profile
router.put("/:id/user", UserController.updateUserProfile);
// Delete user account
router.delete("/:id/user", UserController.deleteUserAccount);
module.exports = router;

