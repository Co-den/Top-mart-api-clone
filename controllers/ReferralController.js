const User = require("../model/UserModel");
const Account = require("../model/AccountModel");

// Get user's referral information
exports.getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "referralCode referralBonus totalReferrals referralEarnings fullName email"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get list of referred users
    const referredUsers = await User.find({ referredBy: userId })
      .select("fullName email createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      referralInfo: {
        referralCode: user.referralCode,
        referralLink: `https://top-m-gvue.vercel.app/signup?ref=${user.referralCode}`,
        totalReferrals: user.totalReferrals || 0,
        referralBonus: user.referralBonus || 0,
        totalEarnings: user.referralEarnings || 0,
      },
      referredUsers,
    });
  } catch (error) {
    console.error("Get referral info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referral information",
      error: error.message,
    });
  }
};

// Get referral statistics (Admin)
exports.getReferralStats = async (req, res) => {
  try {
    const totalReferrals = await User.countDocuments({
      referredBy: { $ne: null },
    });

    const totalReferralBonus = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$referralEarnings" } } },
    ]);

    // Top referrers
    const topReferrers = await User.find({ totalReferrals: { $gt: 0 } })
      .select("fullName email referralCode totalReferrals referralEarnings")
      .sort({ totalReferrals: -1 })
      .limit(10);

    // Recent referrals
    const recentReferrals = await User.find({ referredBy: { $ne: null } })
      .populate("referredBy", "fullName referralCode")
      .select("fullName email createdAt referredBy")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      stats: {
        totalReferrals,
        totalBonusPaid: totalReferralBonus[0]?.total || 0,
        topReferrers,
        recentReferrals,
      },
    });
  } catch (error) {
    console.error("Get referral stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referral statistics",
      error: error.message,
    });
  }
};

// Withdraw referral bonus to main balance
exports.withdrawReferralBonus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has enough referral bonus
    if (amount > (user.referralBonus || 0)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient referral bonus. Available: ${
          user.referralBonus || 0
        }`,
      });
    }

    // Get user's account
    const account = await Account.findOne({ user: userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Transfer from referral bonus to account bonus
    user.referralBonus -= amount;
    await user.save({ validateBeforeSave: false });

    account.bonus += amount;
    await account.save();

    res.status(200).json({
      success: true,
      message: "Referral bonus withdrawn successfully",
      data: {
        withdrawnAmount: amount,
        remainingReferralBonus: user.referralBonus,
        newAccountBonus: account.bonus,
        newAccountBalance: account.balance,
      },
    });
  } catch (error) {
    console.error("Withdraw referral bonus error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to withdraw referral bonus",
      error: error.message,
    });
  }
};

// Validate referral code (for frontend)
exports.validateReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Referral code is required",
      });
    }

    const user = await User.findOne({
      referralCode: code.toUpperCase().trim(),
    }).select("fullName referralCode");

    if (!user) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "Invalid referral code",
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: "Valid referral code",
      referrer: {
        name: user.fullName,
        code: user.referralCode,
      },
    });
  } catch (error) {
    console.error("Validate referral code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate referral code",
      error: error.message,
    });
  }
};
