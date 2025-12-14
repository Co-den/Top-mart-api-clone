const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const userAuth = require("../auth/authController");
const adminAuthser = require("../auth/adminAuthController");

// Get user profile
router.get(
  "/me",
  userAuth.protect,
  userAuth.restrictTo("user"),
  UserController.getCurrentUser
);
// Get all users
router.get("/", adminAuthser.protect, UserController.getAllUsers);
// Get user by ID
router.get(
  "/:id",
  adminAuthser.protect,
  adminAuthser.authorize("admin"),
  UserController.getUserById
);
// Update user profile
router.put(
  "/:id",
  userAuth.protect,
  userAuth.restrictTo("user"),
  UserController.updateUserProfile
);
// Delete user account
router.delete("/:id", adminAuthser.protect, UserController.deleteUserAccount);




module.exports = router;
