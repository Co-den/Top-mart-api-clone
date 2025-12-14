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

// CORRECTED getDeposits Controller
// Based on your actual Deposit schema

exports.getDeposits = async (req, res) => {
  try {
    console.log("Fetching deposits for user:", req.user.id);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    const deposits = await Deposit.find({ user: req.user.id })
      .populate("account", "bankName accountNumber accountName")
      .sort({ createdAt: -1 })
      .lean();

    console.log("Found deposits:", deposits.length);

    if (deposits.length > 0) {
      console.log("Sample deposit:", deposits[0]);
    }

    const formattedDeposits = deposits.map((deposit) => ({
      id: deposit._id,
      amount: deposit.amount,
      date: new Date(deposit.createdAt).toISOString().split("T")[0],
      status: deposit.status,
      reference:
        deposit.reference ||
        `DEP-${deposit._id.toString().slice(-6).toUpperCase()}`,
      // Method should come from the meta object or default
      method:
        deposit.meta?.method || deposit.meta?.paymentMethod || "Bank Transfer",
      // Optional: Include account details if there is a need though not in original request
      accountDetails: deposit.account
        ? {
            bankName: deposit.account.bankName,
            accountNumber: deposit.account.accountNumber,
            accountName: deposit.account.accountName,
          }
        : null,
    }));

    return res.status(200).json({
      status: "success",
      data: formattedDeposits,
    });
  } catch (error) {
    console.error("Error in getDeposits:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getWithdrawals = async (req, res) => {
  try {
    console.log(
      "Fetching withdrawals for user:",
      req.user?.id || req.user?._id
    );

    // Handle both req.user.id and req.user._id just incase of inconsistencies
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    console.log("Searching withdrawals for userId:", userId);
    const withdrawals = await Withdrawal.find({ user: userId })
      .populate({
        path: "account",
        select: "bankName accountNumber accountName",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log("Found withdrawals:", withdrawals.length);

    if (withdrawals.length > 0) {
      console.log(
        "Sample withdrawal structure:",
        JSON.stringify(withdrawals[0], null, 2)
      );
    }

    const formattedWithdrawals = withdrawals.map((withdrawal) => ({
      id: withdrawal._id.toString(),
      amount: withdrawal.amount || 0,
      date: withdrawal.createdAt
        ? new Date(withdrawal.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      status: withdrawal.status || "pending",
      reference:
        withdrawal.reference ||
        `WTH-${withdrawal._id.toString().slice(-6).toUpperCase()}`,
      // Use withdrawal's own bank details first, then fall back to populated account
      bankName: withdrawal.bankName || withdrawal.account?.bankName || "N/A",
      accountNumber:
        withdrawal.accountNumber || withdrawal.account?.accountNumber || "N/A",
      accountName:
        withdrawal.accountName || withdrawal.account?.accountName || "N/A",
      method: withdrawal.meta?.method || "Bank Transfer",
    }));

    return res.status(200).json({
      status: "success",
      data: formattedWithdrawals,
    });
  } catch (error) {
    console.error("Error in getWithdrawals:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
