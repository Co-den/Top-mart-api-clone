// controllers/bankController.js
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

exports.resolveAccountName = async (req, res) => {
  const { accountNumber, bankCode } = req.body;
 
  if (!accountNumber || !bankCode) {
    return res.status(400).json({
      success: false,
      message: "Account number and bank code required",
    });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    res
      .status(200)
      .json({ success: true, accountName: response.data.data.account_name });
  } catch (error) {
    console.error(
      "Paystack resolve error:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ success: false, message: "Unable to fetch account name" });
  }
};
