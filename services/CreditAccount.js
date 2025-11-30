// services/wallet.js
const User = require("../model/UserModel");

exports.creditUserAccount = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.accountBalance = Math.round((user.accountBalance + amount) * 100) / 100;
  await user.save();
  return user.accountBalance;
};
