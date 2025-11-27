const User = require("../model/UserModel");
const PaymentProof = require("../model/PaymentProofModel");

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
    const adminId = req.admin.id; // from JWT middleware

    await User.findByIdAndUpdate(userId, { status: "approved" });
    await PaymentProof.findOneAndUpdate(
      { userId },
      { status: "approved", reviewedBy: adminId }
    );

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
