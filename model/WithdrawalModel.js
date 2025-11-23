const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    reference: { type: String, index: true, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    bankName: String,
    accountNumber: String,
    accountName: String,
    meta: { type: Object },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Withdrawal", withdrawalSchema);
