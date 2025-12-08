const Investment = require("../models/InvestmentModel");
const Plan = require("../models/PlanModel");

// Create a new investment
exports.createInvestment = async (req, res) => {
  try {
    const { planId, depositAmount } = req.body;
    const userId = req.user.id; // Assuming auth middleware sets req.user

    // Validate input
    if (!planId || !depositAmount) {
      return res.status(400).json({
        success: false,
        message: "Plan ID and deposit amount are required",
      });
    }

    // Check if plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Investment plan not found",
      });
    }

    // Validate deposit amount against plan requirements
    if (
      depositAmount < plan.minInvestment ||
      depositAmount > plan.maxInvestment
    ) {
      return res.status(400).json({
        success: false,
        message: `Deposit amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`,
      });
    }

    // Calculate investment details
    const dailyReturn = (depositAmount * plan.dailyReturn) / 100;
    const totalReturn = dailyReturn * plan.duration;
    const investmentEnd = new Date();
    investmentEnd.setDate(investmentEnd.getDate() + plan.duration);

    // Create investment
    const investment = await Investment.create({
      userId,
      planId,
      depositAmount,
      dailyReturn,
      totalReturn,
      investmentEnd,
      status: "active",
    });

    // Populate plan and user details
    await investment.populate("planId", "name duration dailyReturn");
    await investment.populate("userId", "name email");

    res.status(201).json({
      success: true,
      message: "Investment created successfully",
      investment,
    });
  } catch (error) {
    console.error("Create investment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create investment",
      error: error.message,
    });
  }
};

// Get all investments (Admin)
exports.getAllInvestments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get investments with pagination
    const investments = await Investment.find(filter)
      .populate("userId", "name email phone")
      .populate("planId", "name duration dailyReturn")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Investment.countDocuments(filter);

    res.status(200).json({
      success: true,
      investments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all investments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch investments",
      error: error.message,
    });
  }
};

// Get user's investments
exports.getUserInvestments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Build filter
    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const investments = await Investment.find(filter)
      .populate(
        "planId",
        "name duration dailyReturn minInvestment maxInvestment"
      )
      .sort({ createdAt: -1 });

    // Calculate summary
    const summary = {
      total: investments.length,
      active: investments.filter((inv) => inv.status === "active").length,
      completed: investments.filter((inv) => inv.status === "completed").length,
      totalInvested: investments.reduce(
        (sum, inv) => sum + inv.depositAmount,
        0
      ),
      totalEarned: investments.reduce((sum, inv) => sum + inv.totalEarned, 0),
    };

    res.status(200).json({
      success: true,
      investments,
      summary,
    });
  } catch (error) {
    console.error("Get user investments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch investments",
      error: error.message,
    });
  }
};

// Get single investment
exports.getInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const investment = await Investment.findById(id)
      .populate(
        "planId",
        "name duration dailyReturn minInvestment maxInvestment"
      )
      .populate("userId", "name email phone");

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    // Check authorization (user can only view their own investments unless admin)
    if (!isAdmin && investment.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this investment",
      });
    }

    res.status(200).json({
      success: true,
      investment,
    });
  } catch (error) {
    console.error("Get investment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch investment",
      error: error.message,
    });
  }
};

// Update investment status (Admin)
exports.updateInvestmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["active", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be active, completed, or cancelled",
      });
    }

    const investment = await Investment.findById(id);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    // Update status
    investment.status = status;
    investment.lastStatusChangeAt = new Date();
    await investment.save();

    await investment.populate("planId", "name duration dailyReturn");
    await investment.populate("userId", "name email");

    res.status(200).json({
      success: true,
      message: "Investment status updated successfully",
      investment,
    });
  } catch (error) {
    console.error("Update investment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update investment status",
      error: error.message,
    });
  }
};

// Process daily returns (Cron job or Admin trigger)
exports.processDailyReturns = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active investments
    const activeInvestments = await Investment.find({ status: "active" });

    let processedCount = 0;
    let completedCount = 0;

    for (const investment of activeInvestments) {
      // Check if already credited today
      if (
        investment.lastCreditedAt &&
        new Date(investment.lastCreditedAt).setHours(0, 0, 0, 0) >=
          today.getTime()
      ) {
        continue; // Already credited today
      }

      // Check if investment has ended
      if (new Date(investment.investmentEnd) <= new Date()) {
        investment.status = "completed";
        investment.lastStatusChangeAt = new Date();
        completedCount++;
      } else {
        // Credit daily return
        investment.totalEarned += investment.dailyReturn;
        investment.lastCreditedAt = new Date();
        processedCount++;
      }

      await investment.save();
    }

    res.status(200).json({
      success: true,
      message: "Daily returns processed successfully",
      processed: processedCount,
      completed: completedCount,
    });
  } catch (error) {
    console.error("Process daily returns error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process daily returns",
      error: error.message,
    });
  }
};

// Cancel investment (User can cancel before completion)
exports.cancelInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const investment = await Investment.findById(id);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    // Check authorization
    if (!isAdmin && investment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this investment",
      });
    }

    // Check if already completed or cancelled
    if (investment.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel investment with status: ${investment.status}`,
      });
    }

    investment.status = "cancelled";
    investment.lastStatusChangeAt = new Date();
    await investment.save();

    res.status(200).json({
      success: true,
      message: "Investment cancelled successfully",
      investment,
    });
  } catch (error) {
    console.error("Cancel investment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel investment",
      error: error.message,
    });
  }
};

// Delete investment (Admin only - soft delete recommended)
exports.deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    const investment = await Investment.findByIdAndDelete(id);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Investment deleted successfully",
    });
  } catch (error) {
    console.error("Delete investment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete investment",
      error: error.message,
    });
  }
};

// Get investment statistics (Admin)
exports.getInvestmentStats = async (req, res) => {
  try {
    const totalInvestments = await Investment.countDocuments();
    const activeInvestments = await Investment.countDocuments({
      status: "active",
    });
    const completedInvestments = await Investment.countDocuments({
      status: "completed",
    });
    const cancelledInvestments = await Investment.countDocuments({
      status: "cancelled",
    });

    // Calculate total amounts
    const investments = await Investment.find();
    const totalInvested = investments.reduce(
      (sum, inv) => sum + inv.depositAmount,
      0
    );
    const totalEarned = investments.reduce(
      (sum, inv) => sum + inv.totalEarned,
      0
    );
    const totalReturns = investments.reduce(
      (sum, inv) => sum + inv.totalReturn,
      0
    );

    // Get recent investments
    const recentInvestments = await Investment.find()
      .populate("userId", "name email")
      .populate("planId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalInvestments,
        activeInvestments,
        completedInvestments,
        cancelledInvestments,
        totalInvested,
        totalEarned,
        totalReturns,
      },
      recentInvestments,
    });
  } catch (error) {
    console.error("Get investment stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch investment statistics",
      error: error.message,
    });
  }
};
