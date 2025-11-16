// controllers/paystackWebhook.js
const crypto = require("crypto");
const Deposit = require("../model/DepositModel");
const Account = require("../model/AccountModel");
const dotenv = require("dotenv");
dotenv.config({ path: "config.env" });

exports.paystackWebhook = async (req, res) => {
  try {
    // req.rawBody must be available - you must use express.raw() for this route
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      console.warn("Invalid paystack signature");
      return res.status(400).send("Invalid signature");
    }

    const payload = JSON.parse(req.rawBody.toString());
    const event = payload.event;
    const data = payload.data;

    if (event === "charge.success") {
      const reference = data.reference;
      const amount = data.amount; // kobo
      const deposit = await Deposit.findOne({ reference }).populate("account");

      if (!deposit) {
        console.warn("Deposit not found for ref", reference);
        return res.status(404).send("Not found");
      }

      if (deposit.status === "success") {
        return res.status(200).send("Already processed");
      }

      // mark success and update account balance (Naira)
      deposit.status = "success";
      deposit.meta = data;
      await deposit.save();

      const account = deposit.account;
      account.balance = (account.balance || 0) + amount / 100;
      await account.save();

      console.log(
        `Balance updated for account ${account._id}: +${amount / 100}`
      );
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("webhook err", err);
    return res.status(500).send("server error");
  }
};
