const User = require("../model/UserModel");
const Deposit = require("../model/DepositModel");
const Investment = require("../model/InvestmentModel");
const Plan = require("../model/PlanModel");
const { sendDepositEmail } = require("../services/NotifyUser");

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

exports.approveUser = async (req, res) => {
  try {
    const { depositId } = req.params;
    const adminId = req.admin.id;

    // Approve user
    const user = await User.findByIdAndUpdate(
      depositId,
      { status: "approved" },
      { new: true }
    );

    // Approve payment proof
    const proof = await Deposit.findOneAndUpdate(
      { _id: depositId },
      { status: "approved", reviewedBy: adminId },
      { new: true }
    );

    // Create investment record (assuming proof has planId and amount)
    if (proof && proof.planId && proof.amount) {
      const plan = await Plan.findById(proof.planId);
      if (plan) {
        const now = new Date();
        const investment = await Investment.create({
          userId,
          planId: plan._id,
          depositAmount: proof.amount,
          status: "active",
          approvedByAdminId: adminId,
          investmentStart: now,
          investmentEnd: new Date(
            now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
          ),
          lastStatusChangeAt: now,
        });

        // Notify user
        await sendDepositEmail(user.email, {
          amount: proof.amount,
          transactionId: proof._id,
          newBalance: user.walletBalance,
        });

        return res.json({
          message: "User and investment approved successfully",
          user,
          investment,
        });
      }
    }

    res.json({ message: "User approved successfully", userId });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    await User.findByIdAndUpdate(depositId, { status: "rejected" });
    await Deposit.findOneAndUpdate(
      { _id: depositId },
      { status: "rejected", reviewedBy: adminId, reason }
    );

    res.json({ message: "User rejected", depositId, reason });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
