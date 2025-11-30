const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    amount: { type: Number, required: true },
    reference: String,
    proofFileUrl: String,
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_approval",
        "successful",
        "rejected",
        "failed",
      ],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    reason: String,
    meta: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", depositSchema);
