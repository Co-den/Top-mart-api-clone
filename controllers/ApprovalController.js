const User = require("../model/UserModel");
const PaymentProof = require("../model/PaymentProofModel");
const Investment = require("../model/InvestmentModel");
const Plan = require("../model/PlanModel");
const { sendDepositEmail } = require("../services/NotifyUser");

exports.getPendingUsers = async (req, res) => {
  try {
    const proofs = await PaymentProof.find({ status: "pending" }).populate(
      "userId"
    );
    res.json(proofs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.admin.id;

    // Approve user
    const user = await User.findByIdAndUpdate(
      userId,
      { status: "approved" },
      { new: true }
    );

    // Approve payment proof
    const proof = await PaymentProof.findOneAndUpdate(
      { userId },
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
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    await User.findByIdAndUpdate(userId, { status: "rejected" });
    await PaymentProof.findOneAndUpdate(
      { userId },
      { status: "rejected", reviewedBy: adminId, reason }
    );

    res.json({ message: "User rejected", userId, reason });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.submitProof = async (req, res) => {
  try {
    const { planId, amount, transactionId, receipt } = req.body;
    const userId = req.user.id;

    const proof = await PaymentProof.create({
      userId,
      planId,
      amount,
      transactionId,
      receipt,
      status: "pending",
    });

    res.json({
      message: "Payment proof submitted, awaiting admin approval",
      proof,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
