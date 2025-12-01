const axios = require("axios");
const dotenv = require("dotenv");
const User = require("../model/UserModel");

dotenv.config({ path: "./config.env" });

exports.resolveAccount = async (req, res) => {
  try {
    const { bankCode, accountNumber } = req.body;

    if (!bankCode || !accountNumber) {
      return res
        .status(400)
        .json({ message: "Bank code and account number required" });
    }

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.status(200).json({
      status: "success",
      message: "Account resolved successfully",
      accountName: response.data.data.account_name,
      accountNumber: response.data.data.account_number,
      bankCode,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.response?.data?.message ?? err.message });
  }
};

exports.getBanks = async (req, res) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    res.status(200).json({
      status: "success",
      banks: response.data.data,
    });
  } catch (err) {
    console.error("Bank list error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch banks" });
  }
};

exports.updateBankDetails = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        message: "Bank name, account number and account name are required",
      });
    }

    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        bankAccount: {
          bankName,
          accountNumber,
          accountName,
        },
      },
      { new: true }
    ).select("bankAccount");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Bank details updated successfully",
      bankAccount: user.bankAccount,
    });
  } catch (err) {
    console.error("Update bank details error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
