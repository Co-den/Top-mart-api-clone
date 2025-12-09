const cron = require("node-cron");
const Investment = require("../model/InvestmentModel");
const logger = require("../utils/logger");

// Function to process daily returns
const processDailyReturns = async () => {
  try {
    console.log("Starting daily returns processing...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active investments
    const activeInvestments = await Investment.find({ status: "active" });

    logger.info(`Found ${activeInvestments.length} active investments`);

    let processedCount = 0;
    let completedCount = 0;
    let skippedCount = 0;

    for (const investment of activeInvestments) {
      // Check if already credited today
      if (
        investment.lastCreditedAt &&
        new Date(investment.lastCreditedAt).setHours(0, 0, 0, 0) >=
          today.getTime()
      ) {
        skippedCount++;
        continue;
      }

      // Check if investment has ended
      if (new Date(investment.investmentEnd) <= new Date()) {
        investment.status = "completed";
        investment.lastStatusChangeAt = new Date();
        await investment.save();
        completedCount++;
        logger.info(`Investment ${investment._id} marked as completed`);
      } else {
        // Credit daily return
        investment.totalEarned += investment.dailyReturn;
        investment.lastCreditedAt = new Date();
        await investment.save();
        processedCount++;
        logger.info(
          `Credited ${investment.dailyReturn} to investment ${investment._id}`
        );
      }
    }

    logger.info(`Daily returns processing completed:
      - Processed: ${processedCount}
      - Completed: ${completedCount}
      - Skipped: ${skippedCount}
    );`);
    return {
      success: true,
      processed: processedCount,
      completed: completedCount,
      skipped: skippedCount,
    };
  } catch (error) {
    logger.error("Error processing daily returns:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Schedule cron job to run daily at midnight
const startInvestmentCron = () => {
  // Run every day at 12:01 AM
  cron.schedule("1 0 * * *", async () => {
    logger.info("Running scheduled daily returns processing...");
    await processDailyReturns();
  });

  logger.info("Investment cron job scheduled - runs daily at 12:01 AM");
};


const startInvestmentInterval = () => {
  // Calculate milliseconds until next midnight
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    0,
    1,
    0,
    0 // 12:01 AM
  );
  const msToMidnight = night.getTime() - now.getTime();

  // Run first time at midnight
  setTimeout(() => {
    processDailyReturns();

    // Then run every 24 hours
    setInterval(() => {
      processDailyReturns();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }, msToMidnight);

  logger.info(
    `Investment automation will start in ${Math.round(
      msToMidnight / 1000 / 60
    )} minutes`
  );
};

const startTestCron = () => {
  cron.schedule("* * * * *", async () => {
    logger.info("Running TEST daily returns processing...");
    await processDailyReturns();
  });

  logger.info("TEST MODE: Processing returns every minute");
};

module.exports = {
  startInvestmentCron,
  startInvestmentInterval,
  startTestCron,
  processDailyReturns,
};
