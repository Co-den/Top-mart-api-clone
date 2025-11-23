const User = require("../model/UserModel");


//set bank account
exports.setBankAccount = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        bankAccount: { bankName, accountNumber, accountName },
      },
      { new: true }
    ).select("bankAccount");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Bank account updated successfully",
      bankAccount: user.bankAccount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


//update bank details
exports.updateBankDetails = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bankAccount: { bankName, accountNumber, accountName } },
      { new: true }
    ).select("bankAccount");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Bank details updated successfully",
      bankAccount: user.bankAccount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
