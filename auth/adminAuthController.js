const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

exports.protect = (req, res, next) => {
  // accept token from cookie OR Authorization header
  const tokenFromCookie = req.cookies?.admin_token;
  const authHeader = req.headers?.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    req.user = decoded; 
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check req.admin
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Check if admin has the required role
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(
          " or "
        )}. Your role: ${req.admin.role}`,
      });
    }

    next();
  };
};
