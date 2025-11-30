const Plan = require("../model/PlanModel");

const simpleInterest = (principal, ratePercent, durationDays) => {
  const rate = ratePercent / 100;
  const years = durationDays / 365;
  return principal * rate * years; // simple flat return for full duration
};

const compoundInterest = (
  principal,
  ratePercent,
  durationDays,
  compoundingFrequencyPerYear = 12
) => {
  const rate = ratePercent / 100;
  const years = durationDays / 365;
  const n = compoundingFrequencyPerYear;
  return principal * Math.pow(1 + rate / n, n * years) - principal;
};

exports.calculateReturns = async (investment) => {
  const plan = await Plan.findById(investment.planId);
  if (!plan) throw new Error("Plan not found");

  const principal = investment.depositAmount;
  const durationDays = plan.durationDays;

  const interest = plan.compounding
    ? compoundInterest(principal, plan.ratePercent, durationDays)
    : simpleInterest(principal, plan.ratePercent, durationDays);

  const roundedInterest = Math.round(interest * 100) / 100;

  const totalPayout =
    plan.payoutType === "principal_plus_return"
      ? principal + roundedInterest
      : roundedInterest;

  return { interest: roundedInterest, totalPayout };
};

