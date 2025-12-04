const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

// Load config.env reliably relative to this file
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const getTransporter = () => {
  if (!process.env.GMAIL_USERNAME || !process.env.GMAIL_PASSWORD) {
    throw new Error(
      "Email service credentials not configured. Check GMAIL_USERNAME and GMAIL_PASSWORD in config.env"
    );
  }

  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
}

/**
 * Verify the transporter connection (useful to check credentials and connectivity).
 * Throws on failure.
 */
async function verifyTransporter() {
  const transporter = getTransporter();
  try {
    await transporter.verify();
    console.log("Email transporter verified: SMTP connection OK");
    return true;
  } catch (err) {
    console.error(
      "Email transporter verification failed:",
      err && err.message ? err.message : err
    );
    throw err;
  }
}

/**
 * Send mail and log clear info about success/failure.
 * Returns nodemailer `info` object on success, throws on failure.
 */
async function sendMail({ to, subject, html, attachments = [] }) {
  const transporter = getTransporter();
  const mailOptions = {
    from: `"top-mart" <${process.env.GMAIL_USERNAME}>`,
    to,
    subject,
    html,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // nodemailer info.response usually contains server reply (Gmail includes it)
    console.log(
      `Email sent to ${to}: ${info?.response || JSON.stringify(info)}`
    );
    return info;
  } catch (err) {
    // Provide helpful logging for debugging SMTP errors
    console.error(
      `Failed to send email to ${to}:`,
      err && err.message ? err.message : err
    );
    // Attach full error if available
    if (err && err.response) {
      console.error("SMTP response:", err.response);
    }
    throw err;
  }
}

/* Helper exported email functions follow (they call sendMail and will surface errors). */

exports.verifyTransporter = verifyTransporter;

exports.sendSignupEmail = async (email, { name, verificationUrl } = {}) => {
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
  return sendMail({
    to: email,
    subject: "Welcome to top-mart - Verify your email",
    html,
  });
};

exports.sendPasswordResetEmail = async (
  email,
  { resetUrl, expiresIn } = {}
) => {
  if (!email) throw new Error("Missing email");
  const html = `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset the password for this account.</p>
    ${resetUrl ? `<p><a href="${resetUrl}">Reset my password</a></p>` : ""}
    ${expiresIn ? `<p>This link expires in ${expiresIn}.</p>` : ""}
    <p>If you didn't request a password reset, please ignore this email.</p>
  `;
  return sendMail({ to: email, subject: "top-mart - Password Reset", html });
};

exports.sendDepositEmail = async (email, deposit = {}) => {
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
    <p>Thank you for using top-mart.</p>
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

  return sendMail({
    to: email,
    subject: "top-mart - Deposit Confirmation",
    html,
    attachments,
  });
};

exports.sendWithdrawalEmail = async (email, withdrawal = {}) => {
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

  return sendMail({
    to: email,
    subject: "top-mart - Withdrawal Confirmation",
    html,
    attachments,
  });
};

exports.sendAccountCreationEmail = async (email, account = {}) => {
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
  return sendMail({ to: email, subject: "top-mart - Account Created", html });
};
