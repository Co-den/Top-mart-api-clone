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
