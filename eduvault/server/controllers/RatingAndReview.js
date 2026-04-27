// controllers/ratingController.js

const RatingAndReview = require("../models/RatingAndRaview");
const Course = require("../models/Course");
const mongoose = require("mongoose");

// createRating
exports.createRating = async (req, res) => {
  try {
    // get user id (support req.user.id or req.user._id)
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // fetch data from req body
    const { rating, review, courseId } = req.body;

    // basic validations
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing courseId" });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be a number between 1 and 5" });
    }

    // check if user is enrolled in the course
    const courseDetails = await Course.findOne({
      _id: courseId,
      studentsEnrolled: userId,
    }).select("_id");

    if (!courseDetails) {
      return res.status(403).json({
        success: false,
        message: "Student is not enrolled in the course",
      });
    }

    // check if user already reviewed the course
    const alreadyReviewed = await RatingAndReview.findOne({
      user: userId,
      course: courseId,
    }).select("_id");

    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: "Course is already reviewed by the user",
      });
    }

    // create rating and review
    const ratingReview = await RatingAndReview.create({
      rating: numericRating,
      review: review || "",
      course: courseId,
      user: userId,
    });

    // update course with this rating/review (push the ref)
    const updatedCourseDetails = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: { ratingAndReviews: ratingReview._id },
      },
      { new: true }
    ).select("ratingAndReviews");

    // compute aggregate stats for this course (avg & count)
    const stats = await RatingAndReview.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          ratingsCount: { $sum: 1 },
        },
      },
    ]);

    const averageRating = stats.length > 0 ? stats[0].averageRating : 0;
    const ratingsCount = stats.length > 0 ? stats[0].ratingsCount : 0;

    // optionally: try to persist these stats to course document if those fields exist
    // (fail silently if fields don't exist)
    try {
      await Course.findByIdAndUpdate(courseId, {
        $set: {
          averageRating,
          ratingsCount,
        },
      }).catch(() => {});
    } catch (_) {
      // ignore
    }

    // return response
    return res.status(201).json({
      success: true,
      message: "Rating and Review created successfully",
      ratingReview,
      stats: { averageRating, ratingsCount },
      course: updatedCourseDetails,
    });
  } catch (error) {
    console.error("createRating error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// getAverageRating
exports.getAverageRating = async (req, res) => {
  try {
    // accept courseId from body, params, or query
    const courseId = req.body?.courseId || req.params?.courseId || req.query?.courseId;
    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing courseId" });
    }

    const result = await RatingAndReview.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          ratingsCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        averageRating: result[0].averageRating,
        ratingsCount: result[0].ratingsCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Average Rating is 0, no ratings given till now",
      averageRating: 0,
      ratingsCount: 0,
    });
  } catch (error) {
    console.error("getAverageRating error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// getAllRatingAndReviews
exports.getAllRating = async (req, res) => {
  try {
    const allReviews = await RatingAndReview.find({})
      .sort({ rating: -1 })
      .populate({
        path: "user",
        select: "firstName lastName email image",
      })
      .populate({
        path: "course",
        select: "courseName",
      })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      message: "All reviews fetched successfully",
      data: allReviews,
    });
  } catch (error) {
    console.error("getAllRating error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};