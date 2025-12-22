const express = require("express");
const router = express.Router();
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const path = require("path");
const Email = require("../models/Email");
const UniqueRecipient = require("../models/UniqueRecipient");
const nodemailer = require("nodemailer");
const auth = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Use backend URL for tracking pixels (not frontend)
const BACKEND_URL =
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
const APP_URL = process.env.APP_URL || `http://localhost:3000`;

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Upload and validate CSV
router.post("/upload", auth, upload.single("csv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file required" });
    }

    const results = [];
    const errors = [];
    const validEmails = [];

    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on("data", (data) => {
        results.push(data);
        // Check for email column (case-insensitive)
        const emailKey = Object.keys(data).find(
          (key) =>
            key.toLowerCase() === "email" || key.toLowerCase() === "e-mail"
        );
        const email = emailKey
          ? data[emailKey]
          : data.email || data.Email || data.EMAIL;

        if (!email) {
          errors.push({ row: results.length, error: "No email field found" });
        } else if (!isValidEmail(email.trim())) {
          errors.push({
            row: results.length,
            email,
            error: "Invalid email format",
          });
        } else {
          validEmails.push(email.trim());
        }
      })
      .on("end", () => {
        // Clean up file
        fs.unlinkSync(req.file.path);

        res.json({
          total: results.length,
          valid: validEmails.length,
          invalid: errors.length,
          emails: validEmails,
          errors: errors.slice(0, 10), // Return first 10 errors
        });
      })
      .on("error", (err) => {
        console.error("CSV parse error:", err);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: "Failed to parse CSV file" });
      });
  } catch (err) {
    console.error("CSV upload error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to process CSV file" });
  }
});

// Send bulk emails from validated CSV
router.post("/send-bulk", auth, upload.array("files"), async (req, res) => {
  try {
    const { subject, body, category, from, recipients } = req.body;

    if (!subject || !body || !recipients) {
      return res
        .status(400)
        .json({ error: "Subject, body, and recipients are required" });
    }

    const recipientList = JSON.parse(recipients);
    if (!Array.isArray(recipientList) || recipientList.length === 0) {
      return res.status(400).json({ error: "Valid recipients list required" });
    }

    const files = (req.files || []).map((f) => f.filename);
    const emailsSent = [];
    const emailsFailed = [];

    for (const recipient of recipientList) {
      if (!isValidEmail(recipient)) {
        emailsFailed.push({ recipient, error: "Invalid email format" });
        continue;
      }

      try {
        const dbEmail = new Email({
          to: recipient,
          from: from || process.env.EMAIL_USER,
          subject,
          body,
          category: category || "Primary",
          files,
          folder: "Sent",
          unread: false,
          userId: req.user.id,
          status: "sent",
          tracking: {
            opens: 0,
            uniqueOpens: [],
            clicks: [],
            recipientClicks: [],
          },
          recipients: [
            {
              email: recipient,
              status: "sent",
              opened: false,
              clicked: false,
              clickCount: 0,
            },
          ],
          thread: [
            {
              sender: from || "Me",
              body,
              time: new Date(),
              files,
              category: category || "Primary",
            },
          ],
        });
        await dbEmail.save();

        // Track unique recipient
        try {
          await UniqueRecipient.findOneAndUpdate(
            { userId: req.user.id, recipientEmail: recipient },
            {
              $setOnInsert: { firstEmailTime: new Date() },
              $set: { lastEmailTime: new Date() },
              $inc: { totalEmailsSent: 1 },
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error("Error tracking unique recipient:", err);
        }

        // Create tracking pixel URL
        const trackingPixelUrl = `${BACKEND_URL}/api/track/open/${
          dbEmail._id
        }?recipient=${encodeURIComponent(recipient)}`;
        const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;

        // Track links in body
        const trackedBody = body.replace(
          /(https?:\/\/[^\s<>"']+)/gi,
          (url) =>
            `<a href="${BACKEND_URL}/api/track/click/${
              dbEmail._id
            }?url=${encodeURIComponent(url)}&recipient=${encodeURIComponent(
              recipient
            )}" target="_blank">${url}</a>`
        );

        // Convert plain text to HTML if needed
        const htmlBody = body.includes("<")
          ? trackedBody
          : trackedBody.replace(/\n/g, "<br>");

        await transporter.sendMail({
          from: from || process.env.EMAIL_USER,
          to: recipient,
          subject,
          html: `<div>${htmlBody}</div>${trackingPixel}`,
          attachments: files.map((f) => ({
            filename: f,
            path: path.join(__dirname, "../uploads", f),
          })),
        });

        emailsSent.push(dbEmail);
      } catch (err) {
        console.error(`Failed to send to ${recipient}:`, err);
        emailsFailed.push({ recipient, error: err.message });
      }
    }

    res.json({
      message: "Bulk email sending completed",
      sent: emailsSent.length,
      failed: emailsFailed.length,
      emails: emailsSent,
      failures: emailsFailed,
    });
  } catch (err) {
    console.error("Bulk send error:", err);
    res.status(500).json({ error: "Failed to send bulk emails" });
  }
});

module.exports = router;
