const cron = require("node-cron");
const Investment = require("../model/InvestmentModel");
const User = require("../model/UserModel");
const Account = require("../model/AccountModel");
const logger = require('../utils/logger');


// Run daily at midnight
const startInvestmentCron = () => {
  cron.schedule("0 0 * * *", async () => {
    logger.info("Running daily investment returns...");

    try {
      // Find all active investments
      const activeInvestments = await Investment.find({
        status: "active",
        investmentEnd: { $gt: new Date() },
      }).populate("planId userId");

      logger.info(`Processing ${activeInvestments.length} active investments`);

      for (const investment of activeInvestments) {
        try {
          // Calculate daily return amount
          const dailyAmount =
            investment.depositAmount * (investment.dailyReturn / 100);

          // Credit user account
          await Account.findOneAndUpdate(
            { user: investment.userId._id },
            { $inc: { balance: dailyAmount } },
            { new: true }
          );

          // Track total earned
          investment.totalEarned = (investment.totalEarned || 0) + dailyAmount;
          investment.lastCreditedAt = new Date();
          await investment.save();

          logger.info(
            `Credited ${dailyAmount} to user ${investment.userId._id}`
          );

          // Optional: Send notification email
          // await sendDailyCreditEmail(investment.userId.email, { amount: dailyAmount });
        } catch (err) {
          logger.error(
            `Error processing investment ${investment._id}:`,
            err.message
          );
        }
      }

      // Check and complete expired investments
      await completeExpiredInvestments();
    } catch (err) {
      logger.error("Investment cron error:", err.message);
    }
  });

  //console.log("Investment cron job started - runs daily at midnight");
};

//complete expired investments
const completeExpiredInvestments = async () => {
  try {
    const expiredInvestments = await Investment.find({
      status: "active",
      investmentEnd: { $lte: new Date() },
    }).populate("userId planId");

    logger.info(`Found ${expiredInvestments.length} expired investments`);

    for (const investment of expiredInvestments) {
      // Mark as completed
      investment.status = "completed";
      investment.lastStatusChangeAt = new Date();
      await investment.save();

      // Optional: Send completion email
      // await sendInvestmentCompletionEmail(investment.userId.email, {
      //   planName: investment.planId.name,
      //   totalEarned: investment.totalEarned
      // });

      logger.info(`Completed investment ${investment._id}`);
    }
  } catch (err) {
    logger.error("Error completing investments:", err.message);
  }
};


module.exports = { startInvestmentCron };