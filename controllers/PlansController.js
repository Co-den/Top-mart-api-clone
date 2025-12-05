const User = require("../model/UserModel");
const Plan = require("../model/PlanModel");
const Investment = require("../model/InvestmentModel");
//const { sendInvestmentEmail } = require("../utils/email");

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
    const { planId } = req.params;

    // Fetch user and plan
    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Check balance
    if (user.balance < plan.price) {
      return res
        .status(400)
        .json({ message: "Insufficient funds for this plan" });
    }

    // Deduct balance using atomic update (bypasses validation)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: -plan.price } },
      { new: true, runValidators: false }
    );

    // Create investment record
    const now = new Date();
    const investment = await Investment.create({
      userId: user._id,
      planId: plan._id,
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
      newBalance: updatedUser.balance,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
