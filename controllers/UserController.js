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
  const users = await User.find();
  res.status(200).json({
    status: "users fetched successfully",
    data: users,
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
exports.updateUserProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body);
  res.status(200).json({
    status: "user updated successfully",
    data: user,
  });
};
// Delete a user by ID
exports.deleteUserAccount = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).json({
    status: "user deleted successfully",
  });
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("phoneNumber uniqueId bankAccount")
      .populate({ path: "account", select: "balance" });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      phone: user.phoneNumber,
      uniqueId: user.uniqueId,
      balance: user.account?.balance ?? 0,
      bankAccount: user.bankAccount ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
