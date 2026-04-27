const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const emailTemplate = require("../mail/templates/emailVerificationTemplate");

const OTPSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		match: [
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/,
			"Please fill a valid email address",
		],
	},
	otp: {
		type: String,
		required: true,
		trim: true,
		minlength: 4,
		maxlength: 8,
	},
	createdAt: {
		type: Date,
		default: Date.now,
		// TTL in seconds; document auto-deletes after 5 minutes
		expires: 60 * 5,
	},
});

// Define a function to send emails
async function sendVerificationEmail(email, otp) {
	try {
		const mailResponse = await mailSender(
			email,
			"Verification Email",
			emailTemplate(otp)
		);

		// Use concise logging; mailResponse may vary by transporter
		console.info("Verification email queued/sent:", mailResponse?.response || mailResponse);
		return mailResponse;
	} catch (error) {
		// Log the error but don't throw in async post-save path
		console.error("Error sending verification email:", error);
		throw error;
	}
}

// Expose as a schema static so you can call it directly for tests or manual resend
OTPSchema.statics.sendVerificationEmail = sendVerificationEmail;

// Post-save hook: non-blocking send of verification email.
// Using post('save') ensures the save operation isn't delayed by email delivery.
OTPSchema.post("save", function (doc) {
	// only send when newly created
	// mongoose sets isNew to false after save; but here we still want to ensure
	// we only trigger the email when OTP was just created, not on updates.
	if (!doc) return;

	// fire-and-forget; handle errors inside sendVerificationEmail
	sendVerificationEmail(doc.email, doc.otp).catch((err) => {
		// We already logged inside sendVerificationEmail, but keep a backup log here.
		console.error(`Failed to send OTP email for ${doc.email}:`, err?.message || err);
	});
});

const OTP = mongoose.model("OTP", OTPSchema);

module.exports = OTP;