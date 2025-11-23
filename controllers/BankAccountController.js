const axios = require("axios");

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
