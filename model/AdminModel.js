const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const AdminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phoneNumber: { type: String, unique: true, required: true },
  password: { type: String, required: true, minlength: 8 },

  role: {
    type: String,
    enum: ["admin", "superadmin"],
    default: "admin",
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

// VIRTUAL FIELD
AdminSchema.virtual("confirmPassword").set(function (value) {
  this._confirmPassword = value;
});

// VALIDATION using pre-validate hook
AdminSchema.pre("validate", function (next) {
  if (this.isModified("password")) {
    if (this.password !== this._confirmPassword) {
      this.invalidate("confirmPassword", "Passwords do not match");
    }
  }
  next();
});

// HASH PASSWORD
AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update passwordChangedAt when password changes
AdminSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare passwords
AdminSchema.methods.currentPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after JWT
AdminSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

// Generate reset token
AdminSchema.methods.createPasswordResetToken = function () {
  const resetToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("Admin", AdminSchema);
