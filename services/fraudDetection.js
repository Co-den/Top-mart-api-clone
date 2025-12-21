// backend/services/fraudDetection.js
const crypto = require('crypto');

class FraudDetectionService {
  async analyzeDeposit(deposit, user) {
    let riskScore = 0;
    const flags = [];

    try {
      const Deposit = require('../models/Deposit');
      
      // Get user's deposit history
      const userDeposits = await Deposit.find({
        user: user._id,
        status: { $in: ['approved', 'pending'] },
      })
        .sort({ createdAt: -1 })
        .limit(20);

      console.log(`[Fraud Detection] Analyzing deposit ${deposit._id} for user ${user.email}`);

      // ============================================
      // 1. CHECK FOR UNUSUAL AMOUNT
      // ============================================
      if (userDeposits.length >= 3) {
        const amounts = userDeposits.map((d) => d.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const maxAmount = Math.max(...amounts);

        if (deposit.amount > avgAmount * 5) {
          riskScore += 35;
          flags.push({
            type: 'UNUSUAL_AMOUNT',
            severity: 'HIGH',
            message: `Amount is 5x higher than average (₦${Math.round(avgAmount).toLocaleString()})`,
          });
        } else if (deposit.amount > avgAmount * 3) {
          riskScore += 20;
          flags.push({
            type: 'UNUSUAL_AMOUNT',
            severity: 'MEDIUM',
            message: `Amount is 3x higher than average (₦${Math.round(avgAmount).toLocaleString()})`,
          });
        }
      }

      // ============================================
      // 2. CHECK FOR RAPID CONSECUTIVE DEPOSITS
      // ============================================
      const last24Hours = userDeposits.filter((d) => {
        const hoursSince = (Date.now() - new Date(d.createdAt)) / (1000 * 60 * 60);
        return hoursSince < 24;
      });

      if (last24Hours.length > 5) {
        riskScore += 30;
        flags.push({
          type: 'RAPID_DEPOSITS',
          severity: 'HIGH',
          message: `${last24Hours.length} deposits in last 24 hours`,
        });
      } else if (last24Hours.length > 3) {
        riskScore += 15;
        flags.push({
          type: 'RAPID_DEPOSITS',
          severity: 'MEDIUM',
          message: `${last24Hours.length} deposits in last 24 hours`,
        });
      }

      // ============================================
      // 3. CHECK FOR ROUND NUMBERS (common in fraud)
      // ============================================
      if (deposit.amount >= 50000 && deposit.amount % 10000 === 0) {
        riskScore += 10;
        flags.push({
          type: 'ROUND_AMOUNT',
          severity: 'LOW',
          message: 'Suspiciously round amount',
        });
      }

      // ============================================
      // 4. NEW USER WITH LARGE DEPOSIT
      // ============================================
      const accountAge = Date.now() - new Date(user.createdAt);
      const daysOld = accountAge / (1000 * 60 * 60 * 24);

      if (daysOld < 7 && deposit.amount > 100000) {
        riskScore += 25;
        flags.push({
          type: 'NEW_USER_LARGE_DEPOSIT',
          severity: 'HIGH',
          message: `New account (${Math.floor(daysOld)} days old) with large deposit`,
        });
      } else if (daysOld < 3 && deposit.amount > 50000) {
        riskScore += 15;
        flags.push({
          type: 'NEW_USER_LARGE_DEPOSIT',
          severity: 'MEDIUM',
          message: `Very new account (${Math.floor(daysOld)} days old)`,
        });
      }

      // ============================================
      // 5. CHECK FOR DUPLICATE PROOF
      // ============================================
      if (deposit.proof && deposit.proof.url) {
        const proofHash = this.generateImageHash(deposit.proof.url);
        deposit.proof.hash = proofHash;

        const duplicateProof = await Deposit.findOne({
          'proof.hash': proofHash,
          _id: { $ne: deposit._id },
          status: { $in: ['approved', 'pending'] },
        });

        if (duplicateProof) {
          riskScore += 50;
          flags.push({
            type: 'DUPLICATE_PROOF',
            severity: 'CRITICAL',
            message: 'Payment proof matches another deposit',
            relatedDeposit: duplicateProof._id,
          });
        }
      }

      // ============================================
      // 6. CHECK FOR HIGH VELOCITY
      // ============================================
      if (userDeposits.length > 0) {
        const firstDeposit = userDeposits[userDeposits.length - 1];
        const daysSinceFirst =
          (Date.now() - new Date(firstDeposit.createdAt)) / (1000 * 60 * 60 * 24);
        const depositsPerDay = userDeposits.length / Math.max(daysSinceFirst, 1);

        if (depositsPerDay > 3) {
          riskScore += 20;
          flags.push({
            type: 'HIGH_VELOCITY',
            severity: 'MEDIUM',
            message: `${depositsPerDay.toFixed(1)} deposits per day on average`,
          });
        }
      }

      // ============================================
      // 7. FIRST TIME DEPOSIT (extra scrutiny)
      // ============================================
      if (userDeposits.length === 0 && deposit.amount > 50000) {
        riskScore += 15;
        flags.push({
          type: 'FIRST_DEPOSIT_LARGE',
          severity: 'MEDIUM',
          message: 'First deposit with large amount',
        });
      }

      // Calculate final risk level
      const riskLevel =
        riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';

      const recommendation =
        riskScore >= 70
          ? 'REJECT'
          : riskScore >= 50
          ? 'MANUAL_REVIEW'
          : riskScore >= 30
          ? 'VERIFY'
          : 'APPROVE';

      const analysis = {
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        flags,
        recommendation,
        analyzedAt: new Date(),
      };

      console.log(`[Fraud Detection] Result: ${riskLevel} (${riskScore}/100) - ${recommendation}`);

      return analysis;
    } catch (error) {
      console.error('[Fraud Detection] Error:', error);
      return {
        riskScore: 50,
        riskLevel: 'MEDIUM',
        flags: [
          {
            type: 'ANALYSIS_ERROR',
            severity: 'MEDIUM',
            message: 'Could not complete fraud analysis',
          },
        ],
        recommendation: 'MANUAL_REVIEW',
        error: error.message,
      };
    }
  }

  generateImageHash(imageUrl) {
    // Simple hash based on URL
    // In production, you'd download and hash the actual image content
    return crypto.createHash('md5').update(imageUrl).digest('hex');
  }

  // Helper: Get fraud stats for admin dashboard
  async getFraudStats() {
    try {
      const Deposit = require('../models/Deposit');
      
      const highRisk = await Deposit.countDocuments({
        'fraudAnalysis.riskLevel': 'HIGH',
        status: 'pending',
      });

      const mediumRisk = await Deposit.countDocuments({
        'fraudAnalysis.riskLevel': 'MEDIUM',
        status: 'pending',
      });

      const recentFlags = await Deposit.find({
        'fraudAnalysis.riskLevel': { $in: ['HIGH', 'MEDIUM'] },
        status: 'pending',
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'fullName email');

      return {
        highRisk,
        mediumRisk,
        recentFlags,
      };
    } catch (error) {
      console.error('[Fraud Stats] Error:', error);
      return { highRisk: 0, mediumRisk: 0, recentFlags: [] };
    }
  }
}

module.exports = new FraudDetectionService();