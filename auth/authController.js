const crypto = require("crypto");
const User = require("../model/UserModel");
const Account = require("../model/AccountModel");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const { sendSignupEmail, sendAccountCreationEmail } = require("../utils/email");

const jwtCookieExpiresIn = Number(process.env.JWT_COOKIE_EXPIRES_IN);

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user, statusCode, req, res, account = null) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(Date.now() + jwtCookieExpiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "lax",
  });

  // Remove password from output
  user.password = undefined;

  const responsePayload = {
    status: "success",
    token,
    data: {
      user,
    },
  };

  if (account) {
    responsePayload.data.account = {
      id: account._id,
      balance: account.balance,
      bonus: account.bonus,
      currency: account.currency,
    };
  }

  res.status(statusCode).json(responsePayload);
};

// User signup
exports.register = async (req, res) => {
  try {
    // basic required fields validation
    const {
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      referralCode,
    } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newUser = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
      referralCode,
      role: "user",
    });

    // generate an email verification token (plain token returned for email link)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    // store hashed token + expiry on user model if your model expects that; here we save plain token fields
    newUser.emailVerificationToken = verificationToken;
    newUser.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await newUser.save({ validateBeforeSave: false });

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

    // Send welcome email in background (fire-and-forget) so registration is fast
    try {
      const verificationUrl = `${req.protocol}://${req.get(
        "host"
      )}/verify-email?token=${verificationToken}`;

      // Do not await -- let it run in the background. Log errors when they occur.
      sendSignupEmail(newUser.email, {
        name: newUser.fullName,
        verificationUrl,
      })
        .then(() => {
          console.log(`Signup email sent to ${newUser.email}`);
        })
        .catch((emailErr) => {
          console.error(
            "Failed to send signup email (background):",
            emailErr.message || emailErr
          );
        });
    } catch (emailErr) {
      // defensive: if something synchronously throws, log and continue
      console.error(
        "Failed to queue signup email:",
        emailErr.message || emailErr
      );
    }
    sendAccountCreationEmail(newUser.email, {
      name: newUser.fullName,
      accountId: account._id,
    })
      .then(() => {
        console.log(`Account creation email sent to ${newUser.email}`);
      })
      .catch((emailErr) => {
        console.error(
          "Failed to send account creation email (background):",
          emailErr.message || emailErr
        );
      });

    createSendToken(newUser, 201, req, res, account);
  } catch (error) {
    // handle duplicate key (unique) errors and validation errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} already in use` });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
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
  if (!user || !(await user.currentPassword(password, user.password))) {
    return res.status(401).json({
      status: "fail",
      message: "Incorrect phoneNumber or password",
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

    // Fetch full user from DB
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // attach full user document
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
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

exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!user) return next(new AppError("User not found.", 404));

    const correct = await user.currentPassword(req.body.passwordCurrent);

    if (!correct) {
      return next(new AppError("Your current password is wrong.", 401));
    }

    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();

    createSendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};
