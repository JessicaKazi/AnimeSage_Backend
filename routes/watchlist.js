
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("watchlist");

    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json({ watchlist: user.watchlist });
  } catch {
    res.status(500).json({ error: "Unable to load your watchlist." });
  }
});

router.post("/", async (req, res) => {
  try {
    const animeId = Number(req.body.animeId);
    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";
    const coverImage =
      typeof req.body.coverImage === "string" ? req.body.coverImage : "";

    if (
      !Number.isSafeInteger(animeId) ||
      animeId < 1 ||
      !title ||
      title.length > 200 ||
      coverImage.length > 2048 ||
      (coverImage && !/^https:\/\//i.test(coverImage))
    ) {
      return res.status(400).json({ error: "Invalid anime details." });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    const alreadySaved = user.watchlist.some(
      (item) => item.animeId === animeId
    );

    if (!alreadySaved) {
      if (user.watchlist.length >= 500) {
        return res.status(400).json({
          error: "Your watchlist has reached its limit.",
        });
      }

      user.watchlist.push({ animeId, title, coverImage });
      await user.save();
    }

    res.json({ watchlist: user.watchlist });
  } catch {
    res.status(500).json({ error: "Unable to save this anime." });
  }
});

router.delete("/:animeId", async (req, res) => {
  try {
    const animeId = Number(req.params.animeId);

    if (!Number.isSafeInteger(animeId) || animeId < 1) {
      return res.status(400).json({ error: "Invalid anime ID." });
    }

    if (!mongoose.isValidObjectId(req.user.userId)) {
      return res.status(401).json({ error: "Invalid user session." });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    user.watchlist = user.watchlist.filter(
      (item) => item.animeId !== animeId
    );

    await user.save();
    res.json({ watchlist: user.watchlist });
  } catch {
    res.status(500).json({ error: "Unable to remove this anime." });
  }
});

module.exports = router;
