const Deposit = require("../model/DepositModel");
const Investment = require("../model/InvestmentModel");
const Plan = require("../model/PlanModel");
const User = require("../model/UserModel");
const Account = require("../model/AccountModel");
const { emailUser } = require("../services/NotifyUser");

exports.getPendingUsers = async (req, res) => {
  try {
    const deposits = await Deposit.find({ status: "pending" })
      .populate({
        path: "user",
        populate: { path: "bankAccount" },
      })
      .populate("account");

    res.json(deposits);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const adminId = req.admin.id;

    // Approve payment proof and populate user reference
    const proof = await Deposit.findOneAndUpdate(
      { _id: depositId },
      { status: "approved", reviewedBy: adminId },
      { new: true }
    ).populate({
      path: "user",
      populate: { path: "account" },
    });

    if (!proof) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    // ensure we have user document
    const user = proof.user
      ? proof.user
      : await User.findById(proof.userId || proof.user).populate("account");

    if (!user) {
      return res
        .status(404)
        .json({ message: "User for this deposit not found" });
    }

    // find or create account record, prefer populated account
    let account = user.account
      ? typeof user.account === "object"
        ? user.account
        : await Account.findById(user.account)
      : await Account.findOne({ user: user._id });

    if (!account) {
      // create account if none exists (defensive)
      account = await Account.create({
        user: user._id,
        balance: 0,
        bonus: 1000,
        currency: "NGN",
      });
      // link to user
      user.account = account._id;
      await user.save({ validateBeforeSave: false });
    }

    // Update account balance with approved deposit amount
    account.balance = (account.balance || 0) + (proof.amount || 0);
    await account.save();

    // Create investment record if plan exists on deposit
    let investment = null;
    if (proof.planId && proof.amount) {
      const plan = await Plan.findById(proof.planId);
      if (plan) {
        const now = new Date();
        investment = await Investment.create({
          userId: user._id,
          planId: plan._id,
          depositAmount: proof.amount,
          status: "active",
          approvedByAdminId: adminId,
          investmentStart: now,
          investmentEnd: new Date(
            now.getTime() + (plan.durationDays || 0) * 24 * 60 * 60 * 1000
          ),
          lastStatusChangeAt: now,
        });
      }
    }

    // Notify user in background
    emailUser(user.email, {
      amount: proof.amount,
      transactionId: proof._id,
      newBalance: account.balance,
    })
      .then(() => {
        console.log(`Deposit email sent to ${user.email}`);
      })
      .catch((emailErr) => {
        console.error(
          "Failed to send deposit email (background):",
          emailErr.message || emailErr
        );
      });

    return res.json({
      message: "Deposit approved and account balance updated",
      deposit: proof,
      account: {
        id: account._id,
        balance: account.balance,
      },
      investment,
    });
  } catch (err) {
    console.error("approveDeposit error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.rejectUserDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    // Reject payment proof
    await Deposit.findOneAndUpdate(
      { _id: depositId },
      { status: "rejected", reviewedBy: adminId, reason }
    );

    res.json({ message: "User Deposit rejected", depositId, reason });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
