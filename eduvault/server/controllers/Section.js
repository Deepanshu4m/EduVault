const mongoose = require("mongoose");
const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");

/* ================= CREATE SECTION ================= */
exports.createSection = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { sectionName, courseId } = req.body;

        if (!sectionName || !courseId) {
            return res.status(400).json({
                success: false,
                message: "sectionName and courseId are required",
            });
        }

        const course = await Course.findById(courseId).session(session);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        const newSection = await Section.create([{ sectionName }], { session });

        course.courseContent.push(newSection[0]._id);
        await course.save({ session });

        await session.commitTransaction();
        session.endSession();

        const updatedCourse = await Course.findById(courseId)
            .populate({
                path: "courseContent",
                populate: { path: "subSection" },
            });

        return res.status(201).json({
            success: true,
            message: "Section created successfully",
            data: updatedCourse,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: false,
            message: "Failed to create section",
            error: error.message,
        });
    }
};

/* ================= UPDATE SECTION ================= */
exports.updateSection = async (req, res) => {
    try {
        const { sectionName, sectionId, courseId } = req.body;

        if (!sectionName || !sectionId) {
            return res.status(400).json({
                success: false,
                message: "sectionName and sectionId are required",
            });
        }

        const section = await Section.findByIdAndUpdate(
            sectionId,
            { sectionName },
            { new: true }
        );

        if (!section) {
            return res.status(404).json({
                success: false,
                message: "Section not found",
            });
        }

        const course = await Course.findById(courseId).populate({
            path: "courseContent",
            populate: { path: "subSection" },
        });

        return res.status(200).json({
            success: true,
            message: "Section updated successfully",
            data: course,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to update section",
            error: error.message,
        });
    }
};

/* ================= DELETE SECTION ================= */
exports.deleteSection = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { sectionId, courseId } = req.body;

        if (!sectionId || !courseId) {
            return res.status(400).json({
                success: false,
                message: "sectionId and courseId are required",
            });
        }

        const section = await Section.findById(sectionId).session(session);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: "Section not found",
            });
        }

        await Course.findByIdAndUpdate(
            courseId,
            { $pull: { courseContent: sectionId } },
            { session }
        );

        await SubSection.deleteMany(
            { _id: { $in: section.subSection } },
            { session }
        );

        await Section.findByIdAndDelete(sectionId, { session });

        await session.commitTransaction();
        session.endSession();

        const updatedCourse = await Course.findById(courseId).populate({
            path: "courseContent",
            populate: { path: "subSection" },
        });

        return res.status(200).json({
            success: true,
            message: "Section deleted successfully",
            data: updatedCourse,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: false,
            message: "Failed to delete section",
            error: error.message,
        });
    }
};
