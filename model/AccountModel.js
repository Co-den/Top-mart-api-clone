const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    balance: { type: Number, default: 0 },
    currency: { type: String, default: "NGN" },
    accountNumber: String,
    bonus: { type: Number, default: 1100 },

    hasPurchased: { type: Boolean, default: false },

    purchases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Purchase",
      },
    ],

    deposits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Deposit",
      },
    ],

    withdrawals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Withdrawal",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account", accountSchema);
