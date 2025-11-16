const Withdrawal = require("../model/WithdrawalModel.js");
const Account = require("../model/AccountModel.js");

exports.withdrawFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const account = await Account.findOne({ user: userId });
    if (!account) return res.status(404).json({ message: "Account not found" });

    // Rule 1: Minimum withdrawal limit
    if (amount < 1500) {
      return res.status(400).json({ message: "Minimum withdrawal is ₦1500" });
    }

    // Rule 2: Restrict welcome bonus withdrawal
    // Assuming account has fields: balance, bonus, hasPurchased
    if (account.bonus >= amount && !account.hasPurchased) {
      return res.status(400).json({
        message: "Welcome bonus cannot be withdrawn until a purchase is made",
      });
    }

    if (account.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct immediately
    account.balance -= amount;
    await account.save();

    const withdrawal = await Withdrawal.create({
      user: userId,
      account: account._id,
      amount,
      status: "successful",
    });

    res.status(201).json({
      message: "Withdrawal successful",
      withdrawal,
      newBalance: account.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
