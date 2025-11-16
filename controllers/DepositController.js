const axios = require("axios");
const Deposit = require("../model/DepositModel");
const Account = require("../model/AccountModel");

// Initialize deposit
exports.initializeDeposit = async (req, res) => {
  try {
    const user = req.user;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Find or create account
    let account = await Account.findOne({ user: user._id });
    if (!account) {
      account = await Account.create({
        user: user._id,
        balance: 0,
        bonus: 1000,
        currency: "NGN",
      });
    }

    // Create pending deposit
    const deposit = await Deposit.create({
      account: account._id,
      user: user._id,
      amount: Number(amount),
      status: "pending",
    });

    // Call Paystack (amount in kobo)
    const kobo = Math.floor(Number(amount) * 100);
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: kobo,
        metadata: {
          depositId: deposit._id.toString(),
          accountId: account._id.toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.status) {
      deposit.status = "failed";
      deposit.meta = response.data;
      await deposit.save();
      return res
        .status(400)
        .json({ message: response.data.message || "Paystack init failed" });
    }

    const { authorization_url, reference } = response.data.data;
    deposit.reference = reference;
    deposit.meta = response.data.data;
    await deposit.save();

    return res.json({ authorization_url, reference });
  } catch (err) {
    console.error("init deposit err", err.response?.data || err.message);
    return res.status(500).json({ message: "Server error" });
  }
};


exports.verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.query; // Paystack sends this back after payment

    if (!reference) {
      return res.status(400).json({ message: "Reference is required" });
    }

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data;
    if (!data.status || data.data.status !== "success") {
      return res.status(400).json({ message: "Payment not successful" });
    }

    // Find deposit record
    const deposit = await Deposit.findOne({ reference });
    if (!deposit) {
      return res.status(404).json({ message: "Deposit record not found" });
    }

    // Prevent double-crediting
    if (deposit.status === "successful") {
      return res.json({ message: "Deposit already processed" });
    }

    // Mark deposit successful
    deposit.status = "successful";
    await deposit.save();

    // Update account balance
    const account = await Account.findById(deposit.account);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    account.balance += deposit.amount;
    await account.save();

    return res.json({
      message: "Deposit verified and balance updated",
      newBalance: account.balance,
    });
  } catch (err) {
    console.error("verify deposit err", err.response?.data || err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
