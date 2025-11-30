// models/PlanModel.js
const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true, // e.g. 30 for a 30-day plan
    },
    ratePercent: {
      type: Number,
      required: true, // e.g. 12.5 means 12.5% return
    },
    compounding: {
      type: Boolean,
      default: false, // true if returns compound
    },
    payoutType: {
      type: String,
      enum: ["principal_plus_return", "return_only"],
      default: "principal_plus_return",
    },
    minDeposit: {
      type: Number,
      default: 0,
    },
    maxDeposit: {
      type: Number,
      default: Number.MAX_SAFE_INTEGER,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
