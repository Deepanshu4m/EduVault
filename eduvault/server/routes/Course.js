// routes/courseRoutes.js

const express = require("express");
const { body, param, validationResult } = require("express-validator");
const router = express.Router();

// Controllers
const {
  createCourse,
  getAllCourses,
  getCourseDetails,
  getFullCourseDetails,
  editCourse,
  getInstructorCourses,
  deleteCourse,
} = require("../controllers/Course");

const {
  showAllCategories,
  createCategory,
  categoryPageDetails,
} = require("../controllers/Category");

const {
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/Section");

const {
  createSubSection,
  updateSubSection,
  deleteSubSection,
} = require("../controllers/Subsection");

const {
  createRating,
  getAverageRating,
  getAllRating,
} = require("../controllers/RatingAndReview");

const { updateCourseProgress } = require("../controllers/courseProgress");

// Middlewares
const { auth, isInstructor, isStudent, isAdmin } = require("../middlewares/auth");

/**
 * Simple validator result handler
 */
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

/**
 * Small helper that allows either instructor or admin to act
 * (assumes `auth` sets req.user.role)
 */
const isInstructorOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const role = req.user.role || "";
  if (role === "instructor" || role === "admin") return next();
  return res.status(403).json({ message: "Forbidden — instructor or admin only" });
};

/* =========================================================================
   Course routes (RESTful)
   ========================================================================= */

// Create a new course (instructor only)
router.post(
  "/courses",
  auth,
  isInstructor,
  [
    body("title").exists().withMessage("title is required"),
    body("category").optional(),
    // add more body validators as needed
  ],
  runValidation,
  createCourse
);

// List all courses (public)
router.get("/courses", getAllCourses);

// Public course summary/details
router.get(
  "/courses/:courseId",
  [param("courseId").exists().withMessage("courseId required")],
  runValidation,
  getCourseDetails
);

// Full course details (requires auth, e.g., for progress / gated content)
router.get(
  "/courses/:courseId/full",
  auth,
  [param("courseId").exists().withMessage("courseId required")],
  runValidation,
  getFullCourseDetails
);

// Edit a course (instructor who owns the course)
router.put(
  "/courses/:courseId",
  auth,
  isInstructor,
  [param("courseId").exists().withMessage("courseId required")],
  runValidation,
  editCourse
);

// Delete a course (instructor or admin)
router.delete(
  "/courses/:courseId",
  auth,
  isInstructorOrAdmin,
  [param("courseId").exists().withMessage("courseId required")],
  runValidation,
  deleteCourse
);

// Instructor's courses (current instructor)
router.get("/instructor/courses", auth, isInstructor, getInstructorCourses);

// Update course progress (students)
router.post(
  "/courses/:courseId/progress",
  auth,
  isStudent,
  [param("courseId").exists().withMessage("courseId required")],
  runValidation,
  updateCourseProgress
);

/* =========================================================================
   Sections & Subsections (nested resource style)
   ========================================================================= */

// Add section to a course
router.post(
  "/courses/:courseId/sections",
  auth,
  isInstructor,
  [param("courseId").exists().withMessage("courseId required"), body("title").exists().withMessage("title required")],
  runValidation,
  createSection
);

// Update section
router.put(
  "/courses/:courseId/sections/:sectionId",
  auth,
  isInstructor,
  [
    param("courseId").exists(),
    param("sectionId").exists(),
    body("title").optional(),
  ],
  runValidation,
  updateSection
);

// Delete section
router.delete(
  "/courses/:courseId/sections/:sectionId",
  auth,
  isInstructor,
  [param("courseId").exists(), param("sectionId").exists()],
  runValidation,
  deleteSection
);

// Add subsection to a section
router.post(
  "/courses/:courseId/sections/:sectionId/subsections",
  auth,
  isInstructor,
  [
    param("courseId").exists(),
    param("sectionId").exists(),
    body("title").exists().withMessage("title required"),
  ],
  runValidation,
  createSubSection
);

// Update subsection
router.put(
  "/courses/:courseId/sections/:sectionId/subsections/:subSectionId",
  auth,
  isInstructor,
  [param("subSectionId").exists()],
  runValidation,
  updateSubSection
);

// Delete subsection
router.delete(
  "/courses/:courseId/sections/:sectionId/subsections/:subSectionId",
  auth,
  isInstructor,
  [param("subSectionId").exists()],
  runValidation,
  deleteSubSection
);

/* =========================================================================
   Categories (admin)
   ========================================================================= */

// Create category (admin only)
router.post(
  "/categories",
  auth,
  isAdmin,
  [body("name").exists().withMessage("category name required")],
  runValidation,
  createCategory
);

// List categories (public)
router.get("/categories", showAllCategories);

// Category page details (kept as POST to preserve prior controller signature if needed)
router.post("/categories/:categoryId/page-details", [param("categoryId").exists()], runValidation, categoryPageDetails);

/* =========================================================================
   Ratings & Reviews
   ========================================================================= */

// Create rating for a course (student)
router.post(
  "/courses/:courseId/ratings",
  auth,
  isStudent,
  [param("courseId").exists(), body("rating").isInt({ min: 1, max: 5 }).withMessage("rating 1-5 required")],
  runValidation,
  createRating
);

// Get average rating for a course
router.get("/courses/:courseId/ratings/average", [param("courseId").exists()], runValidation, getAverageRating);

// Get all reviews for a course
router.get("/courses/:courseId/reviews", [param("courseId").exists()], runValidation, getAllRating);

/* =========================================================================
   Legacy flat-route aliases (frontend compatibility)
   ========================================================================= */
router.get("/getAllCourses", getAllCourses);
router.post("/getCourseDetails", getCourseDetails);
router.post("/getFullCourseDetails", auth, getFullCourseDetails);
router.post("/createCourse", auth, isInstructor, createCourse);
router.put("/editCourse", auth, isInstructor, editCourse);
router.delete("/deleteCourse", auth, isInstructorOrAdmin, deleteCourse);
router.get("/getInstructorCourses", auth, isInstructor, getInstructorCourses);
router.post("/addSection", auth, isInstructor, createSection);
router.put("/updateSection", auth, isInstructor, updateSection);
router.delete("/deleteSection", auth, isInstructor, deleteSection);
router.post("/addSubSection", auth, isInstructor, createSubSection);
router.put("/updateSubSection", auth, isInstructor, updateSubSection);
router.delete("/deleteSubSection", auth, isInstructor, deleteSubSection);
router.get("/showAllCategories", showAllCategories);
router.post("/getCategoryPageDetails", categoryPageDetails);
router.post("/createRating", auth, isStudent, createRating);
router.get("/getReviews", getAllRating);
router.post("/updateCourseProgress", auth, isStudent, updateCourseProgress);

module.exports = router;