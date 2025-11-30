const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    depositAmount: {
      type: Number,
      required: true,
    },

    // Lifecycle status
    status: {
      type: String,
      enum: ["pending", "rejected", "active", "completed", "cancelled"],
      default: "pending",
    },

    // Admin approval tracking
    approvedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    approvalNote: String,
    rejectionReason: String,

    // Investment cycle timing
    investmentStart: Date,
    investmentEnd: Date,

    // Returns and payout
    returnAmount: {
      type: Number,
      default: 0,
    },
    payoutCredited: {
      type: Boolean,
      default: false,
    },

    // Audit
    lastStatusChangeAt: Date,
  },
  { timestamps: true }
);

 // for efficient maturity scans
investmentSchema.index({ status: 1, investmentEnd: 1 });

module.exports = mongoose.model("Investment", investmentSchema);
