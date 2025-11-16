const User = require("../model/UserModel");

// Create a new user
exports.createUser = async (req, res) => {
  const newUser = await User.create(req.body);
  res.status(201).json({
    status: "user created successfully",
    data: newUser,
  });
};

// Get all users
exports.getAllUsers = async (req, res) => {
  const user = await User.find();
  res.status(200).json({
    status: "users fetched successfully",
    data: user,
  });
};

// Get a user by ID
exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({
    status: "user fetched successfully",
    data: user,
  });
};

// Update a user by ID
exports.updateUserById = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body);
  res.status(200).json({
    status: "user updated successfully",
    data: user,
  });
};
// Delete a user by ID
exports.deleteUserById = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).json({
    status: "user deleted successfully",
  });
};
