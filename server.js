const express = require("express");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/UserRoute");
const authRoutes = require("./routes/AuthRoute");
const adminRoutes = require("./routes/AdminRoute");
const bankRoutes = require("./routes/BankRoutes");
const withdrawRoutes = require("./routes/WithdrawRoute");
const referralRoutes = require("./routes/ReferralRoute");
const depositRoutes = require("./routes/DepositRoute");
const investmentRoutes = require("./routes/InvestmentRoute");
const plansRoutes = require("./routes/PlanRoute");
const approvalRoutes = require("./routes/ApprovalRoute");
const { paystackWebhook } = require("./controllers/PaystackWebhookController");
const { startInvestmentCron } = require("./utils/investmentCron");
const logger = require("./utils/logger");
const Admin = require("./model/AdminModel");

// Enable CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3000/api/auth/register",
  "http://localhost:3000/api/auth/login",
  "https://top-mart-api.onrender.com",
  "https://top-dmtxpqmdq-codens-projects.vercel.app",
  "https://top-m-gvue-git-main-codens-projects.vercel.app",
  "https://top-m-gvue.vercel.app",
  "https://top-mart-api.onrender.com/api/auth/register",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Middleware to parse JSON requests
app.use(express.json());

//cookie-parser
app.use(cookieParser());

// Configure environment variables
dotenv.config({ path: "./config.env" });

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
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

// Seed SuperAdmin account if not exists
const seedSuperAdmin = async () => {
  const existingSuperAdmin = await Admin.findOne({ role: "superadmin" });
  if (!existingSuperAdmin) {
    await Admin.create({
      fullName: process.env.SUPERADMIN_FULLNAME,
      email: process.env.SUPERADMIN_EMAIL,
      phoneNumber: process.env.SUPERADMIN_PHONE,
      password: process.env.SUPERADMIN_PASSWORD,
      confirmPassword: process.env.SUPERADMIN_PASSWORD,
      role: "superadmin",
    });
    logger.info("SuperAdmin account created");
  }
};
seedSuperAdmin();

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/withdrawal", withdrawRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/approval", approvalRoutes);
app.use("/api/referrals", referralRoutes);

// Paystack webhook route
app.post(
  "/api/paystack/webhook",
  express.raw({ type: "*/*" }),
  paystackWebhook
);

//LISTENING SERVER
app.listen(process.env.PORT, () => {
  logger.info(
    `Server is running on ${process.env.LOCALHOST}:${process.env.PORT}`
  );
});
