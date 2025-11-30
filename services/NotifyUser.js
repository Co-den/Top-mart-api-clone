// services/notify.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const getTransporter = () => {
  if (!process.env.GMAIL_USERNAME || !process.env.GMAIL_PASSWORD) {
    throw new Error("Email service credentials not configured");
  }

  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
};

exports.emailUser = async (user, subject, text) => {
  if (!user.email) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"top-mart" <${process.env.GMAIL_USERNAME}>`,
    to: user.email,
    subject,
    text,
  });
};
