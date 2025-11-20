const crypto = require("crypto");
const User = require("../model/UserModel");
const Account = require("../model/AccountModel");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const { sendSignupEmail } = require("../utils/email");

const jwtCookieExpiresIn = Number(process.env.JWT_COOKIE_EXPIRES_IN);

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(Date.now() + jwtCookieExpiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "lax",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// User signup
exports.register = async (req, res) => {
  try {
    const newUser = await User.create({
      fullName: req.body.fullName,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      referralCode: req.body.referralCode,
    });

    // Create account with signup bonus
    const account = await Account.create({
      user: newUser._id,
      balance: 1000,
      bonus: 1000,
      currency: "NGN",
    });

    // Link account to user
    newUser.account = account._id;
    await newUser.save({ validateBeforeSave: false });

    // Send welcome email
    await sendSignupEmail(newUser.email, {
      name: newUser.fullName,
      verificationUrl: `${req.protocol}://${req.get(
        "host"
      )}/verify-email?token=${newUser.emailVerificationToken}`,
    });
    createSendToken(newUser, 201, req, res, account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//user login
exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;

  // Check if phoneNumber and password are provided
  if (!phoneNumber || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide phone-number and password!",
    });
  }

  // Check if user exists
  const user = await User.findOne({ phoneNumber }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({
      status: "fail",
      message: "Incorrect email or password",
    });
  }

  createSendToken(user, 200, req, res);
};

// User logout
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

// Protect routes
exports.protect = (req, res, next) => {
  // accept token from cookie OR Authorization header
  const tokenFromCookie = req.cookies?.jwt;
  const authHeader = req.headers?.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // or fetch user from DB if needed
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Check if user is logged in
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
