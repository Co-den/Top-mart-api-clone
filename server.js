const express = require("express");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/UserRoute");
const authRoutes = require("./routes/AuthRoute");
const transactionRoutes = require("./routes/TransactionRoutes");
const { paystackWebhook } = require("./controllers/PaystackWebhookController");
const transRecordRoutes = require("./routes/TransRecordRoute");
const productRoutes = require("./routes/ProductRoute");
const purchaseRoutes = require("./routes/PurchaseRoute");

// Enable CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3000/api/auth/register",
  "http://localhost:3000/api/auth/login",
  "https://top-mart-api.onrender.com",
  "https://top-dmtxpqmdq-codens-projects.vercel.app",
  "https://top-m-gvue.vercel.app"
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

// ensure cookie-parser is registered before your auth middleware/routes
app.use(cookieParser());

// ...existing code: routes/middleware registration ...
// ...existing code...

// Configure environment variables
dotenv.config({ path: "./config.env" });

// Connect to MongoDB
mongoose
  .connect(process.env.DATABASE_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// User routes
//app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/transrecords", transRecordRoutes);
app.use("/api/products", productRoutes);
app.use("/api/purchases", purchaseRoutes);

// Paystack webhook route
app.post(
  "/api/paystack/webhook",
  express.raw({ type: "*/*" }),
  paystackWebhook
);

//LISTENING SERVER
app.listen(process.env.PORT, () => {
  console.log(
    `Server is running on ${process.env.LOCALHOST}:${process.env.PORT}`
  );
});
