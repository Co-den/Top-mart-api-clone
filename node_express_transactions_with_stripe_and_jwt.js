// Project: Deposit & Withdrawal with JWT auth, Transaction model, Stripe integration, and input validation
// Added: User model now includes an array of transactions (with date and time for each deposit/withdrawal)

// models/User.js
const mongoose = require('mongoose');

const transactionEntrySchema = new mongoose.Schema({
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  transactions: [transactionEntrySchema], // stores history with timestamps
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

// models/Transaction.js
const { Schema } = mongoose;

const transactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  metadata: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);

// In controllers/transactionController.js we modify deposit and withdraw logic to record transactions in the user's document as well.

// controllers/transactionController.js (modified parts)
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.createDepositIntent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { amount, currency = 'usd' } = req.body;
  if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

  try {
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      status: 'pending',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { transactionId: transaction._id.toString(), userId: req.user._id.toString() },
    });

    transaction.stripePaymentIntentId = paymentIntent.id;
    await transaction.save();

    res.json({ clientSecret: paymentIntent.client_secret, transactionId: transaction._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.withdraw = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { amount } = req.body;
  if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

  try {
    const user = await User.findById(req.user._id);
    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient funds' });

    const transaction = await Transaction.create({
      user: user._id,
      type: 'withdrawal',
      amount,
      status: 'succeeded',
    });

    user.balance -= amount;
    user.transactions.push({ type: 'withdrawal', amount, date: new Date() });
    await user.save();

    res.json({ message: 'Withdrawal successful', balance: user.balance, transactionId: transaction._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const metadata = pi.metadata || {};
    const transactionId = metadata.transactionId;

    try {
      const tx = await Transaction.findById(transactionId);
      if (!tx || tx.status === 'succeeded') return res.json({ received: true });

      tx.status = 'succeeded';
      await tx.save();

      const user = await User.findById(tx.user);
      user.balance += tx.amount;
      user.transactions.push({ type: 'deposit', amount: tx.amount, date: new Date() });
      await user.save();
    } catch (err) {
      console.error('Error processing webhook:', err);
    }
  }
  res.json({ received: true });
};
