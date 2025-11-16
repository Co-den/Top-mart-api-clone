const Deposit = require("../model/DepositModel");
const Withdrawal = require("../model/WithdrawalModel");
const Account = require("../model/AccountModel");

exports.getRecords = async (req, res) => {
  const account = await Account.findOne({ user: req.user._id });
  if (!account) return res.status(404).json({ message: "Account not found" });

  const deposits = await Deposit.find({ account: account._id }).sort(
    "-createdAt"
  );
  const withdrawals = await Withdrawal.find({ account: account._id }).sort(
    "-createdAt"
  );

  return res.json({ account, deposits, withdrawals });
};
