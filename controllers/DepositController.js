const Account = require("../model/AccountModel");
const Deposit = require("../model/DepositModel");
const mongoose = require("mongoose");

exports.initializeDeposit = async (req, res) => {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let account = await Account.findOne({ user: user._id });
    if (!account) {
      account = await Account.create({
        user: user._id,
        balance: 0,
        bonus: 1000,
        currency: "NGN",
      });
    }

    const deposit = await Deposit.create({
      account: account._id,
      user: user._id,
      amount: Number(amount),
      status: "pending",
    });

    // If you want to skip Paystack for now:
    return res.json({ message: "Deposit initiated", deposit });
  } catch (err) {
    console.error("init deposit err", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.submitProof = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { fileUrl } = req.body;

    const deposit = await Deposit.findByIdAndUpdate(
      depositId,
      { proofFileUrl: fileUrl, status: "awaiting_approval" },
      { new: true }
    );

    res.json({ message: "Proof submitted, awaiting admin approval", deposit });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const adminId = req.admin.id;

    const deposit = await Deposit.findById(depositId).populate("account");
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });

    deposit.status = "successful";
    deposit.reviewedBy = adminId;
    await deposit.save();

    deposit.account.balance += deposit.amount;
    await deposit.account.save();

    res.json({
      message: "Deposit approved and balance updated",
      newBalance: deposit.account.balance,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.rejectDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    const deposit = await Deposit.findByIdAndUpdate(
      depositId,
      { status: "rejected", reviewedBy: adminId, reason },
      { new: true }
    );

    res.json({ message: "Deposit rejected", deposit });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

//get deposit by id
exports.getDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(depositId)) {
      return res.status(400).json({ message: "Invalid deposit ID" });
    }

    const deposit = await Deposit.findById(depositId).populate({
      path: "user",
      populate: { path: "bankAccount" },
    });

    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    res.json({ deposit });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//get all deposits - admin only
exports.getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate("user", "name email")
      .populate("account", "balance currency");
    res.json({ deposits });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
