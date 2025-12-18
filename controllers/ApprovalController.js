const Deposit = require("../model/DepositModel");
const Account = require("../model/AccountModel");
const { emailUser } = require("../services/NotifyUser");



// Get all deposits for admin dashboard
exports.getAllDeposits = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const deposits = await Deposit.find(query)
      .populate('user', 'fullName firstName lastName email')
      .populate('account')
      .sort({ createdAt: -1 });

    const formattedDeposits = deposits.map(deposit => {
      const user = deposit.user || {};
      
      return {
        _id: deposit._id,
        userId: user,
        user: user,
        amount: deposit.amount,
        status: deposit.status,
        paymentProof: deposit.proof?.url || "",
        proofUrl: deposit.proof?.url || "",
        receiptUrl: deposit.proof?.url || "",
        proof: {
          url: deposit.proof?.url || "",
          senderName: deposit.proof?.senderName || "",
          originalName: deposit.proof?.originalName || "",
          filename: deposit.proof?.filename || "",
        },
        createdAt: deposit.createdAt,
        submittedAt: deposit.createdAt,
      };
    });

    res.json(formattedDeposits);
  } catch (err) {
    console.error("getAllDeposits error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const adminId = req.admin.id;

    // Find and approve the deposit
    const deposit = await Deposit.findById(depositId).populate("user");

    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    // Check if deposit has proof submitted
    if (!deposit.proof || !deposit.proof.url) {
      return res.status(400).json({
        message: "Cannot approve deposit without payment proof",
      });
    }

    // Check if already approved
    if (deposit.status === "approved") {
      return res.status(400).json({
        message: "Deposit already approved",
      });
    }

    // Get user
    const user = deposit.user;
    if (!user) {
      return res.status(404).json({
        message: "User for this deposit not found",
      });
    }

    // Find or create user account
    let account = await Account.findOne({ user: user._id });

    if (!account) {
      account = await Account.create({
        user: user._id,
        balance: 0,
        bonus: 1000,
        currency: "NGN",
      });
    }

    // Update account balance
    const previousBalance = account.balance || 0;
    account.balance = previousBalance + deposit.amount;
    await account.save();

    // Update deposit status
    deposit.status = "approved";
    deposit.reviewedBy = adminId;
    deposit.approvedAt = new Date();
    await deposit.save();

    // Send email notification (non-blocking)
    emailUser(user.email, {
      amount: deposit.amount,
      transactionId: deposit._id,
      previousBalance,
      newBalance: account.balance,
      senderName: deposit.proof.senderName,
    })
      .then(() => {
        console.log(`Deposit approval email sent to ${user.email}`);
      })
      .catch((emailErr) => {
        console.error("Failed to send deposit email:", emailErr.message);
      });

    return res.json({
      message: "Deposit approved and account recharged successfully",
      deposit: {
        id: deposit._id,
        amount: deposit.amount,
        status: deposit.status,
        proof: deposit.proof,
      },
      account: {
        id: account._id,
        previousBalance,
        newBalance: account.balance,
        amountAdded: deposit.amount,
      },
    });
  } catch (err) {
    console.error("approveDeposit error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

exports.rejectUserDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    // Reject payment proof
    await Deposit.findOneAndUpdate(
      { _id: depositId },
      { status: "rejected", reviewedBy: adminId, reason }
    );

    res.json({ message: "User Deposit rejected", depositId, reason });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
