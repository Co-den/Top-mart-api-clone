// controllers/purchaseController.js
const Product = require("../model/ProductModel");
const Purchase = require("../model/PurchaseModel");
const Account = require("../model/AccountModel");

exports.buyProduct = async (req, res) => {
  try {
    const userId = req.user.id; // JWT
    const productId = req.params.productId;

    // Get account using user id
    const account = await Account.findOne({ user: userId });
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create purchase
    const purchase = await Purchase.create({
      account: account._id,
      product: product._id,
      amountPaid: product.price,
      dailyReturn: product.dailyReturn,
      totalReturn: product.totalReturn,
      endDate: new Date(Date.now() + product.cycleDays * 86400000),
    });

    // Update Account
    account.purchases.push(purchase._id);
    account.hasPurchased = true;

    await account.save();

    res.json({
      message: "Investment Successful",
      purchase,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
