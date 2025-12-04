const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const AdminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phoneNumber: { type: String, unique: true, required: true },
  password: { type: String, required: true, minlength: 8 },
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

// Instance method to check if the provided password is correct
AdminSchema.methods.currentPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

AdminSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.confirmPassword = undefined;
  next();
});

// Middleware to update passwordChangedAt before saving the user
AdminSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Instance method to check if the provided password is correct
AdminSchema.methods.currentPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password was changed after token was issued
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

// Instance method to generate password reset token
AdminSchema.methods.createPasswordResetToken = function () {
  const resetToken =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // (10 minutes)
  return resetToken;
};

module.exports = mongoose.model("Admin", AdminSchema);
