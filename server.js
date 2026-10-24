
require("dotenv").config();

import recommendationsRoutes from "./routes/recommendations.js";

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from backend/.env");
}

const helmet = require("helmet");
const authRoutes = require("./routes/auth");
const watchlistRoutes = require("./routes/watchlist");

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}));
app.use(express.json({ limit: "20kb" }));

// anime watchlist
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);

// anime recommendation
app.use("/api/recommendations", recommendationsRoutes);

const animeQuery = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(
        search: $search
        type: ANIME
        sort: TRENDING_DESC
        isAdult: false
      ) {
        id
        title {
          romaji
          english
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
        }
        bannerImage
        averageScore
        episodes
        status
        genres
        seasonYear
      }
    }
  }
`;

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/anime", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);

    if (search.length > 100) {
      return res.status(400).json({ error: "Search is too long." });
    }

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: animeQuery,
        variables: {
          search: search || null,
          page,
          perPage: 18,
        },
      }),
    });

    if (!response.ok) {
      return res.status(502).json({
        error: "The anime catalogue provider is temporarily unavailable.",
      });
    }

    const result = await response.json();

    if (result.errors) {
      return res.status(502).json({
        error: "Could not retrieve anime catalogue data.",
      });
    }

    const anime = result.data.Page.media.map((item) => ({
      id: item.id,
      title: item.title.english || item.title.romaji || "Untitled",
      originalTitle: item.title.romaji,
      description: item.description || "No description available.",
      coverImage: item.coverImage.extraLarge || item.coverImage.large,
      bannerImage: item.bannerImage,
      score: item.averageScore,
      episodes: item.episodes,
      status: item.status,
      genres: item.genres,
      year: item.seasonYear,
    }));

    res.json({ page, results: anime });
  } catch (error) {
    console.error("Anime API error:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((error) =>
      console.error("MongoDB connection failed:", error.message)
    );
} else {
  console.log("MongoDB not configured; catalogue API can still run.");
}

app.listen(PORT, () => {
  console.log(`AnimeSage API running at http://localhost:${PORT}`);
});
