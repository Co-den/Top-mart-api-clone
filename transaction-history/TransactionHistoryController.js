const Transaction = require("../models/Transaction");


//WIDTHDRAWAL HISTORY
export const getWithdrawalHistory = async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      user: req.user.id,
      type: "withdrawal"
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      withdrawals
    });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


//DEPOSIT HISTORY
exports.getDepositHistory = async (req, res) =>{
  const deposits = await Transaction.find({
    user: req.user.id,
    type: 'deposit'
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: deposits.length,
    deposits
  });
}