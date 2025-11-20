const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({path: "./config.env"});

function getTransporter() {
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
}

async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"top-mart" <${process.env.GMAIL_USERNAME}>`,
    to,
    subject,
    html,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}

exports.sendSignupEmail = async (email, { name, verificationUrl } = {}) => {
  try {
    if (!email) throw new Error("Missing email");

    const html = `
      <h2>Welcome to top-mart${name ? `, ${name}` : ""}!</h2>
      <p>Thanks for signing up. Please verify your email to activate your account.</p>
      ${
        verificationUrl
          ? `<p><a href="${verificationUrl}">Verify my email</a></p>`
          : ""
      }
      <p>If you didn't sign up, ignore this message.</p>
    `;

    await sendMail({
      to: email,
      subject: "Welcome to top-mart - Verify your email",
      html,
    });
  } catch (err) {
    console.error(`Signup Email Failed for ${email}:`, err.message);
    throw err;
  }
};

exports.sendPasswordResetEmail = async (
  email,
  { resetUrl, expiresIn } = {}
) => {
  try {
    if (!email) throw new Error("Missing email");

    const html = `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset the password for this account.</p>
      ${resetUrl ? `<p><a href="${resetUrl}">Reset my password</a></p>` : ""}
      ${expiresIn ? `<p>This link expires in ${expiresIn}.</p>` : ""}
      <p>If you didn't request a password reset, please ignore this email.</p>
    `;

    await sendMail({ to: email, subject: "Agrify - Password Reset", html });
  } catch (err) {
    console.error(`Password Reset Email Failed for ${email}:`, err.message);
    throw err;
  }
};

exports.sendDepositEmail = async (email, deposit = {}) => {
  try {
    if (!email || !deposit.amount)
      throw new Error("Missing email or deposit data");

    const html = `
      <h2>Deposit Received</h2>
      <p>We received a deposit of <strong>$${deposit.amount}</strong>.</p>
      ${
        deposit.transactionId
          ? `<p>Transaction ID: ${deposit.transactionId}</p>`
          : ""
      }
      ${
        deposit.newBalance !== undefined
          ? `<p>New Balance: $${deposit.newBalance}</p>`
          : ""
      }
      <p>Thank you for using Agrify.</p>
    `;

    const attachments = deposit.receipt
      ? [
          {
            filename: deposit.receipt.filename || "deposit-receipt.pdf",
            content: deposit.receipt.content,
            contentType: deposit.receipt.contentType || "application/pdf",
          },
        ]
      : [];

    await sendMail({
      to: email,
      subject: "top-mart - Deposit Confirmation",
      html,
      attachments,
    });
  } catch (err) {
    console.error(`Deposit Email Failed for ${email}:`, err.message);
    throw err;
  }
};

exports.sendWithdrawalEmail = async (email, withdrawal = {}) => {
  try {
    if (!email || !withdrawal.amount)
      throw new Error("Missing email or withdrawal data");

    const html = `
      <h2>Withdrawal Processed</h2>
      <p>A withdrawal of <strong>$${
        withdrawal.amount
      }</strong> has been processed.</p>
      ${
        withdrawal.transactionId
          ? `<p>Transaction ID: ${withdrawal.transactionId}</p>`
          : ""
      }
      ${
        withdrawal.newBalance !== undefined
          ? `<p>New Balance: $${withdrawal.newBalance}</p>`
          : ""
      }
      <p>If you did not authorize this, contact support immediately.</p>
    `;

    const attachments = withdrawal.receipt
      ? [
          {
            filename: withdrawal.receipt.filename || "withdrawal-receipt.pdf",
            content: withdrawal.receipt.content,
            contentType: withdrawal.receipt.contentType || "application/pdf",
          },
        ]
      : [];

    await sendMail({
      to: email,
      subject: "Agrify - Withdrawal Confirmation",
      html,
      attachments,
    });
  } catch (err) {
    console.error(`Withdrawal Email Failed for ${email}:`, err.message);
    throw err;
  }
};

exports.sendAccountCreationEmail = async (email, account = {}) => {
  try {
    if (!email) throw new Error("Missing email");

    const html = `
      <h2>Your Account Has Been Created</h2>
      <p>Your account with top-mart is now active.</p>
      ${
        account.accountId
          ? `<p>Account ID: <strong>${account.accountId}</strong></p>`
          : ""
      }
      ${account.plan ? `<p>Plan: ${account.plan}</p>` : ""}
      <p>Get started by logging in and completing your profile.</p>
    `;

    await sendMail({ to: email, subject: "Agrify - Account Created", html });
  } catch (err) {
    console.error(`Account Creation Email Failed for ${email}:`, err.message);
    throw err;
  }
};
