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
    proof: {
      filename: String,
      originalName: String,
      url: String,
      cloudinaryId: String,
      senderName: String,
      uploadedAt: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "failed"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    meta: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", depositSchema);
