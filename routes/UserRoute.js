const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const AuthController = require("../auth/authController");
const adminAuthser = require("../auth/adminAuthController");

// Get user profile
router.get(
  "/me",
  AuthController.protect,
  AuthController.restrictTo("user"),
  UserController.getCurrentUser
);
// Get all users
router.get("/", adminAuthser.protect, UserController.getAllUsers);
// Get user by ID
router.get(
  "/:id",
  adminAuthser.protect,
  AuthController.restrictTo("admin"),
  UserController.getUserById
);
// Update user profile
router.put(
  "/:id",
  AuthController.protect,
  AuthController.restrictTo("user"),
  UserController.updateUserProfile
);
// Delete user account
router.delete("/:id", adminAuthser.protect, UserController.deleteUserAccount);

router.get("/user-deposits", AuthController.protect, UserController.getDeposits);
router.get(
  "/user-withdrawals",
  AuthController.protect,
  UserController.getWithdrawals
);

module.exports = router;
