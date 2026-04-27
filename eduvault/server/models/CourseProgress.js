// models/courseProgress.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const courseProgressSchema = new Schema(
  {
    courseID: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // change to match your User model name if different
      required: true,
      index: true,
    },
    completedVideos: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubSection",
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
    toObject: { virtuals: true },
  }
);

/**
 * Ensure only one progress document per (userId, courseID).
 * NOTE: adding a unique index will fail if duplicates already exist in DB.
 * If duplicates exist, either clean them up first or remove `unique: true`.
 */
courseProgressSchema.index({ userId: 1, courseID: 1 }, { unique: true });

/* ----------------- Instance helpers ----------------- */

/**
 * Mark a video as completed (idempotent).
 * @param {ObjectId|String} videoId
 */
courseProgressSchema.methods.markVideoCompleted = async function (videoId) {
  const vid = String(videoId);
  if (!this.completedVideos.map(String).includes(vid)) {
    this.completedVideos.push(videoId);
    await this.save();
  }
  return this;
};

/**
 * Check whether a video is completed.
 * @param {ObjectId|String} videoId
 * @returns {Boolean}
 */
courseProgressSchema.methods.isVideoCompleted = function (videoId) {
  const vid = String(videoId);
  return this.completedVideos.map(String).includes(vid);
};

/* ----------------- Static helpers ----------------- */

/**
 * Get (or create) progress doc for a user+course.
 * If createIfMissing is true, it will create and return a new doc when none exists.
 */
courseProgressSchema.statics.getForUserCourse = async function (
  userId,
  courseID,
  createIfMissing = true
) {
  const filter = { userId, courseID };
  let doc = await this.findOne(filter);
  if (!doc && createIfMissing) {
    // use upsert to avoid race conditions
    doc = await this.findOneAndUpdate(
      filter,
      { $setOnInsert: { completedVideos: [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  return doc;
};

/* ----------------- Virtuals ----------------- */

// number of videos completed
courseProgressSchema.virtual("completedCount").get(function () {
  return Array.isArray(this.completedVideos) ? this.completedVideos.length : 0;
});

module.exports = mongoose.model("CourseProgress", courseProgressSchema);