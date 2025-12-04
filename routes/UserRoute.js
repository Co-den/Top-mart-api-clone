const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const AuthController = require("../auth/authController");

router.use(AuthController.protect);

// Get user profile
router.get(
  "/me",
  AuthController.restrictTo("user"),
  UserController.getCurrentUser
);
// Get all users
router.get(
  "/",
  AuthController.restrictTo(["admin", "superadmin"]),
  UserController.getAllUsers
);
// Get user by ID
router.get(
  "/:id",
  AuthController.restrictTo("admin"),
  UserController.getUserById
);
// Update user profile
router.put("/:id", UserController.updateUserProfile);
// Delete user account
router.delete(
  "/:id",
  AuthController.restrictTo("admin"),
  UserController.deleteUserAccount
);
module.exports = router;
