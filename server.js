const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { startInvestmentCron } = require("./utils/investmentCron");
const logger = require("./utils/logger");
const app = require("./app");
// Configure environment variables
dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

// Connect to MongoDB
mongoose
  .connect(process.env.DATABASE_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error) => {
    logger.error("MongoDB connection error:", error);
  });
startInvestmentCron();
//startTestCron();

//LISTENING SERVER
app.listen(process.env.PORT, () => {
  logger.info(
    `Server is running on ${process.env.LOCALHOST}:${process.env.PORT}`
  );
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
