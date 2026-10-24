
import express from "express";

const router = express.Router();

const ANILIST_URL = "https://graphql.anilist.co";

const animeFields = `
  id
  title {
    romaji
    english
  }
  coverImage {
    large
  }
  averageScore
  genres
  episodes
  description(asHtml: false)
`;

router.get("/", async (req, res) => {
  try {
    const genre = String(req.query.genre || "").trim();
    const animeId = Number(req.query.animeId);

    let query;
    let variables;

    if (req.query.animeId && Number.isInteger(animeId) && animeId > 0) {
      query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            recommendations(
              perPage: 12
              sort: RATING_DESC
            ) {
              nodes {
                mediaRecommendation {
                  ${animeFields}
                }
              }
            }
          }
        }
      `;

      variables = { id: animeId };
    } else {
      const allowedGenres = [
        "Action", "Adventure", "Comedy", "Drama", "Fantasy",
        "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
        "Sports", "Supernatural", "Thriller"
      ];

      if (genre && !allowedGenres.includes(genre)) {
        return res.status(400).json({ error: "Invalid anime genre." });
      }

      query = `
        query ($genre: [String], $page: Int) {
          Page(page: $page, perPage: 12) {
            media(
              type: ANIME
              genre_in: $genre
              sort: POPULARITY_DESC
              isAdult: false
            ) {
              ${animeFields}
            }
          }
        }
      `;

      variables = {
        genre: genre ? [genre] : undefined,
        page: 1
      };
    }

    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      return res.status(502).json({
        error: "AniList could not provide recommendations."
      });
    }

    let anime;

    if (req.query.animeId) {
      anime = (data.data?.Media?.recommendations?.nodes || [])
        .map((item) => item.mediaRecommendation)
        .filter(Boolean);
    } else {
      anime = data.data?.Page?.media || [];
    }

    return res.json({
      recommendations: anime,
      count: anime.length
    });
  } catch (error) {
    console.error("Recommendations error:", error.message);

    return res.status(500).json({
      error: "Unable to load anime recommendations."
    });
  }
});

export default router;
