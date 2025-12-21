//const { hash } = require("crypto");
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
    // FRAUD ANALYSIS
    fraudAnalysis: {
      riskScore: {
        type: Number,
        default: 0,
      },
      riskLevel: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "LOW",
      },
      flags: [
        {
          type: {
            type: String,
          },
          severity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          },
          message: String,
          relatedDeposit: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Deposit",
          },
        },
      ],
      recommendation: {
        type: String,
        enum: ["APPROVE", "VERIFY", "MANUAL_REVIEW", "REJECT"],
        default: "APPROVE",
      },
      analyzedAt: Date,
    },
    proof: {
      filename: String,
      originalName: String,
      url: String,
      cloudinaryId: String,
      senderName: String,
      uploadedAt: { type: Date, default: Date.now },
      hash: String,
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
