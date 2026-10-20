
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!payload.userId) {
      return res.status(401).json({ error: "Invalid authentication token." });
    }

    req.user = { userId: payload.userId };
    next();
  } catch {
    return res.status(401).json({
      error: "Your session is invalid or has expired. Please sign in again.",
    });
  }
}

module.exports = authenticateToken;
