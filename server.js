const express = require("express");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
//const userRoutes = require("./routes/UserRoute");
const authRoutes = require("./routes/AuthRoute");
const transactionRoutes = require("./routes/TransactionRoutes");
const { paystackWebhook } = require("./controllers/PaystackWebhookController");
const transRecordRoutes = require("./routes/TransRecordRoute");
const productRoutes = require("./routes/ProductRoute");
const purchaseRoutes = require("./routes/PurchaseRoute");

// Middleware to parse JSON requests
app.use(express.json());

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
