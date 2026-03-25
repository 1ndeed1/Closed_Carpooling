const nodemailer = require("nodemailer");

/**
 * Sends an OTP to the user's email.
 * For development, it also logs the OTP to the console.
 */
const fs = require("fs");
const path = require("path");

const sendOtpEmail = async (email, otp) => {
    const logMsg = `[${new Date().toISOString()}] OTP: ${otp} | Email: ${email}\n`;
    console.log(`[AUTH] Sending OTP ${otp} to ${email}`);

    // Log to a local file for easy access
    try {
        const logPath = path.join(__dirname, "..", "otp.log");
        fs.appendFileSync(logPath, logMsg);
        console.log(`📝 OTP recorded in ${logPath}`);
    } catch (e) {
        console.error("Failed to write OTP to file:", e);
    }

    // Skip actual sending if credentials are not provided (useful for dev)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("⚠️ EMAIL_USER or EMAIL_PASS not set. Skipping real email send.");
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"RideNet - Carpooling Project" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Organization Verification OTP",
            html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #ef4444; text-align: center;">RideNet</h2>
            <p>Hello,</p>
            <p>You requested to join an organization on RideNet. Please use the following One-Time Password (OTP) to verify your account:</p>
            <div style="background: #fdf2f2; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ef4444; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 RideNet Carpooling. All rights reserved.</p>
          </div>
        `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Email sent to ${email}`);
    } catch (err) {
        console.error("❌ Failed to send OTP email:", err);
        console.warn("⚠️ Email failed, but you can still find the code in otp.log for testing!");
        // We don't throw error here so the app continues to the OTP entry screen
    }
};

module.exports = { sendOtpEmail };
