const Investment = require("../model/InvestmentModel");
const Plan = require("../model/PlanModel");
const User = require("../model/UserModel"); // assuming you have this
const cR = require("../services/Returns");
const cUW = require("../services/CreditAccount");
const { emailUser } = require("../services/NotifyUser");

// User submits a deposit
exports.submitDeposit = async (req, res) => {
  try {
    const { userId, planId, amount } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (amount < plan.minDeposit || amount > plan.maxDeposit) {
      return res.status(400).json({ error: "Amount outside plan limits" });
    }

    const investment = await Investment.create({
      userId,
      planId,
      depositAmount: amount,
      status: "pending",
      lastStatusChangeAt: new Date(),
    });

    res.json({
      message: "Deposit submitted, awaiting admin approval",
      investment,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin approves deposit (starts cycle)
exports.approveInvestment = async (req, res) => {
  try {
    const { adminId, note } = req.body;
    const investment = await Investment.findById(req.params.id).populate(
      "planId userId"
    );
    if (!investment)
      return res.status(404).json({ error: "Investment not found" });
    if (investment.status !== "pending")
      return res.status(400).json({ error: "Already processed" });

    const now = new Date();
    investment.status = "active";
    investment.approvedByAdminId = adminId;
    investment.approvalNote = note || "";
    investment.investmentStart = now;
    investment.investmentEnd = new Date(
      now.getTime() + investment.planId.durationDays * 24 * 60 * 60 * 1000
    );
    investment.lastStatusChangeAt = now;

    await investment.save();

    await emailUser(
      investment.userId,
      "Investment Approved",
      `Your investment in ${
        investment.planId.name
      } has started. Matures on ${investment.investmentEnd.toDateString()}.`
    );

    res.json({ message: "Investment approved and cycle started", investment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin rejects deposit
exports.rejectInvestment = async (req, res) => {
  try {
    const { adminId, reason } = req.body;
    const investment = await Investment.findById(req.params.id).populate(
      "userId planId"
    );
    if (!investment)
      return res.status(404).json({ error: "Investment not found" });
    if (investment.status !== "pending")
      return res.status(400).json({ error: "Already processed" });

    investment.status = "rejected";
    investment.rejectionReason = reason || "Not specified";
    investment.approvedByAdminId = adminId;
    investment.lastStatusChangeAt = new Date();

    await investment.save();

    res.json({ message: "Investment rejected", investment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cron job or manual trigger for matured investments
exports.processMaturedInvestments = async (req, res) => {
  try {
    const now = new Date();
    const matured = await Investment.find({
      status: "active",
      investmentEnd: { $lte: now },
    }).populate("planId userId");

    for (const inv of matured) {
      if (inv.payoutCredited) continue; // idempotency

      const { interest, totalPayout } = await cR.calculateReturns(inv);
      await cUW.creditUserWallet(inv.userId._id, totalPayout);

      inv.returnAmount = interest;
      inv.status = "completed";
      inv.payoutCredited = true;
      inv.lastStatusChangeAt = new Date();
      await inv.save();

      await emailUser(
        inv.userId,
        "Investment Matured",
        `Your investment has matured. Interest: ${interest}. Credited: ${totalPayout}.`
      );
    }

    res.json({
      message: "Matured investments processed",
      count: matured.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
