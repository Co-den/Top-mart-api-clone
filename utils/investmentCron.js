const cron = require("node-cron");
const Investment = require("../model/InvestmentModel");
const User = require("../model/UserModel");
const Account = require("../model/AccountModel");
const logger = require("./logger");

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

      let successCount = 0;
      let failCount = 0;

      for (const investment of activeInvestments) {
        try {
          // Calculate daily return amount
          const dailyAmount =
            investment.depositAmount * (investment.dailyReturn / 100);

          // Find and credit the user's account
          const account = await Account.findOne({
            user: investment.userId._id,
          });

          if (!account) {
            logger.error(`Account not found for user ${investment.userId._id}`);
            failCount++;
            continue;
          }

          // Credit account balance
          await Account.findByIdAndUpdate(
            account._id,
            { $inc: { balance: dailyAmount } },
            { new: true }
          );

          // Track total earned
          investment.totalEarned = (investment.totalEarned || 0) + dailyAmount;
          investment.lastCreditedAt = new Date();
          await investment.save();

          logger.info(
            `Credited ${dailyAmount} to account ${account._id} for user ${investment.userId._id}`
          );
          successCount++;

          // Optional: Send notification email
          // await sendDailyCreditEmail(investment.userId.email, { amount: dailyAmount });
        } catch (err) {
          failCount++;
          logger.error(`Error processing investment ${investment._id}:`, {
            error: err.message,
            stack: err.stack,
            investmentId: investment._id,
          });
        }
      }

      logger.info(
        `Daily returns completed: ${successCount} successful, ${failCount} failed`
      );

      // Check and complete expired investments
      await completeExpiredInvestments();
    } catch (err) {
      logger.error("Investment cron error:", {
        error: err.message,
        stack: err.stack,
      });
    }
  });

  logger.info("Investment cron job started - runs daily at midnight");
};

module.exports = { startInvestmentCron };
