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
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    investmentStart: {
      type: Date,
      default: Date.now,
    },
    investmentEnd: {
      type: Date,
      required: true,
    },
    dailyReturn: {
      type: Number,
      required: true,
    },
    totalReturn: {
      type: Number,
      required: true,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    lastCreditedAt: {
      type: Date,
    },
    lastStatusChangeAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Investment", investmentSchema);
