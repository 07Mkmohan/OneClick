const cron = require("node-cron");
const Email = require("../models/Email");
const nodemailer = require("nodemailer");
const path = require("path");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Use backend URL for tracking pixels
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

// Send scheduled email
async function sendScheduledEmail(email) {
  try {
    const trackingPixel = `<img src="${BACKEND_URL}/api/track/open/${email._id}?recipient=${encodeURIComponent(email.to)}" width="1" height="1" style="display:none"/>`;
    const trackedBody = email.body.replace(
      /(https?:\/\/[^\s]+)/g,
      (url) =>
        `<a href="${BACKEND_URL}/api/track/click/${email._id}?url=${encodeURIComponent(url)}&recipient=${encodeURIComponent(email.to)}">${url}</a>`
    );

    await transporter.sendMail({
      from: email.from || process.env.EMAIL_USER,
      to: email.to,
      subject: email.subject,
      html: `${trackedBody}<br>${trackingPixel}`,
      attachments: email.files.map((f) => ({
        filename: f,
        path: path.join(__dirname, "../uploads", f),
      })),
    });

    // Update email status
    email.status = "sent";
    const recipient = email.recipients.find((r) => r.email === email.to);
    if (recipient) {
      recipient.status = "sent";
    }
    await email.save();

    console.log(`Scheduled email sent to ${email.to}`);
  } catch (err) {
    console.error(`Failed to send scheduled email to ${email.to}:`, err);
    email.status = "failed";
    const recipient = email.recipients.find((r) => r.email === email.to);
    if (recipient) {
      recipient.status = "failed";
    }
    await email.save();
  }
}

// Check and send emails scheduled for specific date/time
async function checkScheduledEmails() {
  try {
    const now = new Date();
    const scheduledEmails = await Email.find({
      status: "scheduled",
      scheduledFor: { $lte: now },
    });

    for (const email of scheduledEmails) {
      await sendScheduledEmail(email);
    }
  } catch (err) {
    console.error("Error checking scheduled emails:", err);
  }
}

// Check emails scheduled for day of week
async function checkDayOfWeekEmails() {
  try {
    const today = new Date();
    const currentDay = today.getDay();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    // Check for emails scheduled for today
    const scheduledEmails = await Email.find({
      status: "scheduled",
      scheduledType: "dayOfWeek",
      scheduledDayOfWeek: currentDay,
    });

    for (const email of scheduledEmails) {
      // Check if it's time to send (default 9 AM if no specific time)
      const scheduledTime = email.scheduledFor || new Date();
      scheduledTime.setDate(today.getDate());
      scheduledTime.setHours(9, 0, 0, 0);

      if (scheduledTime <= today) {
        await sendScheduledEmail(email);
      }
    }
  } catch (err) {
    console.error("Error checking day of week emails:", err);
  }
}

// Start scheduler
function startScheduler() {
  // Check every minute for date/time scheduled emails
  cron.schedule("* * * * *", () => {
    checkScheduledEmails();
  });

  // Check every hour for day of week scheduled emails
  cron.schedule("0 * * * *", () => {
    checkDayOfWeekEmails();
  });

  console.log("Email scheduler started");
}

module.exports = { startScheduler, sendScheduledEmail };

