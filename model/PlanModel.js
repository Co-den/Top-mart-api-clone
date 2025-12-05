const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cycleDays: { type: Number, required: true },
    price: { type: Number, required: true },
    dailyReturn: { type: Number, required: true },
    totalReturn: { type: Number, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
