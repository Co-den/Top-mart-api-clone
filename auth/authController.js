const crypto = require("crypto");
const User = require("../model/UserModel");
const Account = require("../model/AccountModel");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

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
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
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

    createSendToken(newUser, 201, req, res, account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//user login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide email and password!",
    });
  }

  // Check if user exists
  const user = await User.findOne({ email }).select("+password");
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
exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in!",
    });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return res.status(401).json({
      message: "User no longer exists",
    });
  }

  req.user = currentUser;
  next();
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
