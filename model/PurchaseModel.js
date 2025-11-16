// models/Purchase.js
const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true,
  },

  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  amountPaid: Number,
  dailyReturn: Number,
  totalReturn: Number,

  startDate: { type: Date, default: Date.now },
  endDate: Date,
  status: { type: String, default: "active" },
});

module.exports = mongoose.model("Purchase", purchaseSchema);
