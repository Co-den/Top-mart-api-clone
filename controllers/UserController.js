const User = require("../model/UserModel");
const Deposit = require("../model/DepositModel");
const Withdrawal = require("../model/WithdrawalModel");

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
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
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

exports.getDeposits = async (req, res) => {
  try {
    console.log("Fetching deposits for user:", req.user.id);

    const deposits = await Deposit.find({
      $or: [
        { user_id: req.user.id },
        { userId: req.user.id },
        { user: req.user.id },
      ],
    }).sort({ createdAt: -1 });

    console.log("Found deposits:", deposits.length);

    res.json({
      status: "success",
      data: deposits,
    });
  } catch (error) {
    console.error("Error fetching deposits:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;

    const withdrawals = await Withdrawal.find({ user_id: userId }).sort({
      createdAt: -1,
    });

    res.json({
      status: "success",
      data: withdrawals,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
};
