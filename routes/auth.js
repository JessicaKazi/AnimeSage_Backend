
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "2h", algorithm: "HS256" }
  );
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };
}

router.post("/register", authLimiter, async (req, res) => {
  try {
    const username =
      typeof req.body.username === "string" ? req.body.username.trim() : "";
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({
        error: "Username must be 3–24 characters using letters, numbers, or underscores.",
      });
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        error: "Password must be between 8 and 72 characters.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        error: "That email address or username is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      passwordHash,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "That email address or username is already registered.",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({ error: "Unable to create your account." });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Unable to sign in." });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(401).json({ error: "Account not found." });
    }

    return res.json({ user: publicUser(user) });
  } catch {
    return res.status(401).json({ error: "Invalid user session." });
  }
});

module.exports = router;
