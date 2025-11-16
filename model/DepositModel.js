const mongoose = require("mongoose");


const depositSchema = new mongoose.Schema(
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
    meta: { type: Object },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Deposit", depositSchema);
