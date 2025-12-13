const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const generateUniqueId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letters = Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${letters}${number}`;
};

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    confirmPassword: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    uniqueId: { type: String, unique: true, default: generateUniqueId },
    bankAccount: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountName: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    referralBonus: {
      type: Number,
      default: 0,
    },
    totalReferrals: {
      type: Number,
      default: 0,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.confirmPassword = undefined;
  next();
});

// Middleware to update passwordChangedAt before saving the user
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Instance method to check if the provided password is correct
userSchema.methods.currentPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // (10 minutes)
  return resetToken;
};

// Generate unique referral code before saving
userSchema.pre("save", async function (next) {
  if (!this.referralCode) {
    this.referralCode = await generateUniqueReferralCode();
  }
  next();
});

// function to generate unique referral code
const generateUniqueReferralCode = async () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existingUser = await mongoose
      .model("User")
      .findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return code;
}

// Create and export the User model
const User = mongoose.model("User", userSchema);

module.exports = User;
