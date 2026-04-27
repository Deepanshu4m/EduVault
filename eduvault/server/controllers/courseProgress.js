const mongoose = require("mongoose");
const CourseProgress = require("../models/CourseProgress");
const SubSection = require("../models/SubSection");

exports.updateCourseProgress = async (req, res) => {
  const { courseId, subSectionId } = req.body;
  const userId = req.user && req.user.id;

  // basic validations
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (!courseId || !subSectionId) {
    return res.status(400).json({ success: false, error: "courseId and subSectionId are required" });
  }
  if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(subSectionId)) {
    return res.status(400).json({ success: false, error: "Invalid ID format" });
  }

  try {
    // check if subsection exists (and fetch any course reference if present)
    const subSection = await SubSection.findById(subSectionId).select("course"); // adjust field name if needed
    if (!subSection) {
      return res.status(404).json({ success: false, error: "SubSection not found" });
    }

    // If SubSection documents store the course reference, verify it matches the provided courseId
    if (subSection.course && subSection.course.toString() !== courseId.toString()) {
      return res.status(400).json({ success: false, error: "SubSection does not belong to the provided courseId" });
    }

    // Atomic update: add subsection to completedVideos only if not already present.
    // Use upsert so a CourseProgress document is created if it doesn't exist yet.
    const updateResult = await CourseProgress.updateOne(
      { courseID: courseId, userId: userId },
      {
        $addToSet: { completedVideos: subSectionId },
        $setOnInsert: { userId: userId, courseID: courseId, createdAt: new Date() } // set other default fields if required
      },
      { upsert: true }
    );

    // updateResult shape (mongoose): { acknowledged, matchedCount, modifiedCount, upsertedId? }
    // If modifiedCount === 1 or upsertedId exists -> we added the subsection.
    if ((updateResult.modifiedCount && updateResult.modifiedCount > 0) || updateResult.upsertedId) {
      return res.status(200).json({
        success: true,
        message: "Course progress updated successfully",
      });
    }

    // matched but not modified => the subsection was already present
    if (updateResult.matchedCount && updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: "SubSection already completed",
      });
    }

    // fallback
    return res.status(500).json({
      success: false,
      error: "Could not update course progress",
    });
  } catch (error) {
    console.error("updateCourseProgress error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
