
const mongoose = require("mongoose");

const savedAnimeSchema = new mongoose.Schema(
  {
    animeId: { type: Number, required: true },
    title: { type: String, required: true, maxlength: 200 },
    coverImage: { type: String, default: "" },
  },
  { _id: false }
);

const watchProgressSchema = new mongoose.Schema(
  {
    animeId: { type: Number, required: true },
    title: { type: String, required: true, maxlength: 200 },
    episode: { type: Number, required: true, min: 1 },
    positionSeconds: { type: Number, default: 0, min: 0 },
    durationSeconds: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    watchlist: {
      type: [savedAnimeSchema],
      default: [],
    },
    watchProgress: {
      type: [watchProgressSchema],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
