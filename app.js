const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const AppError = require("./utils/appError");

// ROUTES
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
const globalErrorHandler = require("./controllers/ErrorController");
const { paystackWebhook } = require("./controllers/PaystackWebhookController");
const aiRoutes = require("./routes/AiRoute");
const chatRoutes = require('./routes/ChatbotRoute');


// UTILITIES
const logger = require("./utils/logger");
const Admin = require("./model/AdminModel");

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());



// Handle all other routes
app.all("/", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

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


// MOUNTED ROUTES
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
app.use("/api/ai", aiRoutes);
app.use('/api/chat', chatRoutes);

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

// Paystack webhook route
app.post(
  "/api/paystack/webhook",
  express.raw({ type: "*/*" }),
  paystackWebhook
);



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

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
  skip: (req) => req.user && req.user.role === "admin",
});
app.use("/api", limiter);

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
