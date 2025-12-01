const Admin = require("../model/AdminModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const jwtCookieExpiresIn = Number(process.env.ADMIN_COOKIE_EXPIRES_IN) || 90;

const signToken = (id) => {
  return jwt.sign({ id }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: process.env.ADMIN_JWT_EXPIRES,
  });
};

const createSendToken = (admin, statusCode, req, res) => {
  const token = signToken(admin._id);

  res.cookie("jwt", token, {
    expires: new Date(Date.now() + jwtCookieExpiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  admin.passwordHash = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { admin },
  });
};

exports.registerAdmin = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      accessCode,
    } = req.body;
    if (
      !fullName ||
      !email ||
      !phoneNumber ||
      !password ||
      !confirmPassword ||
      !accessCode
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newAdmin = new Admin({
      fullName,
      email,
      passwordHash: hashedPassword,
      confirmPasswordHash: hashedPassword,
      accessCode,
    });
    await newAdmin.save();

    createSendToken(newAdmin, 201, req, res);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password!" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    createSendToken(admin, 200, req, res);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyAdmin = async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("id email name role");
    if (!admin) return res.status(401).json({ message: "Admin not found" });

    res.json({
      status: "success",
      user: {
        id: admin._id,
        email: admin.email,
        fullName: admin.name,
      },
    });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

exports.logoutAdmin = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
};
