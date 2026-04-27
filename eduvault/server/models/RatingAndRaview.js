const mongoose = require("mongoose");

/**
 * RatingAndReview schema
 * - Each user can leave only one review per course (unique compound index)
 * - rating: required number (1-5)
 * - review: required string with trimming and length limit
 * - timestamps enabled
 * - static helper to recalculate average rating on the Course model after changes
 */

const ratingAndReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // prefer capitalized model name
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isFinite,
        message: "Rating must be a finite number",
      },
    },
    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Course",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index so a user can review a course only once
ratingAndReviewSchema.index({ course: 1, user: 1 }, { unique: true });

// Static method to compute average rating and update Course doc
ratingAndReviewSchema.statics.calculateAverageRating = async function (courseId) {
  if (!courseId) return null;

  // this === Model
  const mongooseModel = this;

  const obj = await mongooseModel.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$course",
        avgRating: { $avg: "$rating" },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  // Default values if no ratings
  const averageRating = obj && obj.length > 0 ? parseFloat(obj[0].avgRating.toFixed(2)) : 0;
  const ratingsCount = obj && obj.length > 0 ? obj[0].ratingsCount : 0;

  // Update the Course model (assumes Course model is registered as 'Course')
  try {
    const Course = mongoose.model("Course");
    // Update or set fields; adjust field names if your Course schema uses different names
    await Course.findByIdAndUpdate(
      courseId,
      { averageRating, ratingsCount },
      { new: true, runValidators: true }
    );
  } catch (err) {
    // Log but don't throw to avoid breaking review operations
    // (If Course model isn't registered you might see an error here)
    // eslint-disable-next-line no-console
    console.error("Failed to update Course average rating:", err.message || err);
  }

  return { averageRating, ratingsCount };
};

// After saving a review (create or update), recalc the course rating
ratingAndReviewSchema.post("save", function () {
  // this.constructor refers to the model
  // fire-and-forget is fine; errors are handled inside calculateAverageRating
  void this.constructor.calculateAverageRating(this.course);
});

// After removing a review via document.remove()
ratingAndReviewSchema.post("remove", function () {
  void this.constructor.calculateAverageRating(this.course);
});

// Handle findOneAndDelete / findOneAndRemove (when docs are removed via query)
ratingAndReviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    void doc.constructor.calculateAverageRating(doc.course);
  }
});

// Handle findOneAndUpdate: recalc in case rating/course changed
ratingAndReviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    void doc.constructor.calculateAverageRating(doc.course);
  }
});

module.exports = mongoose.model("RatingAndReview", ratingAndReviewSchema);