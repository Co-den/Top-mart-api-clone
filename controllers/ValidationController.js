const { body } = require("express-validator");

exports.registerValidator = [
  body("name").isLength({ min: 2 }).withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be 6+ chars"),
];

exports.loginValidator = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").exists().withMessage("Password required"),
];

exports.depositValidator = [
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be > 0"),
  body("currency").optional().isString(),
];

exports.withdrawValidator = [
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be > 0"),
];
