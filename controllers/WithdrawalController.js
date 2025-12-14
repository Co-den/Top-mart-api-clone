const Withdrawal = require("../model/WithdrawalModel.js");
const Account = require("../model/AccountModel.js");
const User = require("../model/UserModel.js");

exports.withdrawFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const account = await Account.findOne({ user: userId });
    if (!account) return res.status(404).json({ message: "Account not found" });

    const user = await User.findById(userId).select("bankAccount");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Rule 0: Must have bank account set
    if (!user.bankAccount || !user.bankAccount.accountNumber) {
      return res
        .status(400)
        .json({
          message: "Bank account not set. Please add your bank details first.",
        });
    }

    // Rule 1: Minimum withdrawal limit
    if (amount < 1500) {
      return res.status(400).json({ message: "Minimum withdrawal is ₦1500" });
    }

    // Rule 2: Restrict welcome bonus withdrawal
    if (account.bonus >= amount && !account.hasPurchased) {
      return res.status(400).json({
        message: "Welcome bonus cannot be withdrawn until a purchase is made",
      });
    }

    // Rule 3: Sufficient balance
    if (account.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct immediately
    account.balance -= amount;
    await account.save();

    // Create withdrawal record with bank details
    const withdrawal = await Withdrawal.create({
      user: userId,
      account: account._id,
      amount,
      status: "pending",
      bankName: user.bankAccount.bankName,
      accountNumber: user.bankAccount.accountNumber,
      accountName: user.bankAccount.accountName,
    });

    res.status(201).json({
      message: "Withdrawal request submitted successfully",
      withdrawal,
      newBalance: account.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
