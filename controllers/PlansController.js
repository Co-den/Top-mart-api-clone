const User = require("../model/UserModel");
const Plan = require("../model/PlanModel");
const Investment = require("../model/InvestmentModel");

exports.createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json({
      status: "success",
      results: plans.length,
      plans,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.buyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    // Fetch user and plan
    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);
    if (!user || !plan) {
      return res.status(404).json({ message: "User or Plan not found" });
    }

    // Check balance
    if (user.walletBalance < plan.price) {
      return res
        .status(400)
        .json({ message: "Insufficient funds for this plan" });
    }

    // Deduct balance
    user.walletBalance -= plan.price;
    await user.save();

    // Create investment record
    const now = new Date();
    const investment = await Investment.create({
      user: user._id,
      plan: plan._id,
      depositAmount: plan.price,
      status: "active",
      investmentStart: now,
      investmentEnd: new Date(
        now.getTime() + plan.cycleDays * 24 * 60 * 60 * 1000
      ),
      lastStatusChangeAt: now,
      dailyReturn: plan.dailyReturn,
      totalReturn: plan.totalReturn,
    });

    // Trigger automation (e.g. cron job or queue to credit daily returns)
    await sendInvestmentEmail(user.email, {
      planName: plan.name,
      amount: plan.price,
      investmentId: investment._id,
    });

    res.json({
      message: "Plan purchased successfully",
      investment,
      newBalance: user.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
