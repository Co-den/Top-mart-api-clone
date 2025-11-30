// jobs/maturity.js
const cron = require("node-cron");
const Investment = require("../model/InvestmentModel");
const User = require("../model/UserModel");
const cR = require("../services/Returns");
const cUW = require("../services/CreditAccount");
const { emailUser } = require("../services/NotifyUser");

exports.startMaturityJob = () => {
  // Run every hour; adjust to midnight if preferred: '0 0 * * *'
  cron.schedule(
    "0 * * * *",
    async () => {
      const now = new Date();
      const matured = await Investment.find({
        status: "active",
        investmentEnd: { $lte: now },
      }).populate("planId userId");

      for (const inv of matured) {
        try {
          if (inv.payoutCredited) continue; // prevent double-credit

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
        } catch (err) {
          console.error("Error processing investment", inv._id, err.message);
        }
      }
    },
    { timezone: "UTC" }
  );
};
