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
      status: "pending", // better to mark as pending until processed
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
