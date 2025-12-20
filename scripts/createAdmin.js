// scripts/createAdmin.js
const mongoose = require("mongoose");
const Admin = require("../model/AdminModel");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: "../config.env" });
const logger = require("../utils/logger");

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose
      .connect(process.env.DATABASE_URI)
      .then(() => {
        logger.info("Connected to MongoDB");
      })
      .catch((error) => {
        logger.error("MongoDB connection error:", error);
      });

    // admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFullName = process.env.ADMIN_FULL_NAME || "System Admin";

    if (!adminEmail || !adminPassword) {
      console.error(
        "❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables"
      );
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("⚠️  Admin with this email already exists");
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Name: ${existingAdmin.fullName}`);

      // Ask if they want to update password
      console.log(
        "\nTo update password, delete the existing admin first or use a different email"
      );
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin
    const admin = await Admin.create({
      email: adminEmail,
      password: hashedPassword,
      fullName: adminFullName,
      role: "admin",
      createdAt: new Date(),
    });

    console.log("✅ Admin created successfully!");
    console.log("----------------------------");
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.fullName}`);
    console.log(`ID: ${admin._id}`);
    console.log("----------------------------");
    console.log("You can now login with these credentials");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

// Run the script
createAdmin();
