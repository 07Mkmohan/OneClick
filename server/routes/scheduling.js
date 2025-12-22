const express = require("express");
const router = express.Router();
const Email = require("../models/Email");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
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

const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;

// Schedule email
router.post("/schedule", auth, upload.array("files"), async (req, res) => {
  try {
    const {
      to,
      subject,
      body,
      category,
      from,
      scheduleType,
      scheduledDate,
      scheduledTime,
      dayOfWeek,
      bulkRecipients,
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required" });
    }

    const files = (req.files || []).map((f) => f.filename);
    const recipients = bulkRecipients ? JSON.parse(bulkRecipients) : [to];

    let scheduledFor = null;
    let scheduledDayOfWeek = null;

    if (scheduleType === "date" && scheduledDate) {
      scheduledFor = new Date(scheduledDate);
      if (scheduledTime) {
        const [hours, minutes] = scheduledTime.split(":");
        scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
    } else if (scheduleType === "time" && scheduledTime) {
      scheduledFor = new Date();
      const [hours, minutes] = scheduledTime.split(":");
      scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (scheduledFor < new Date()) {
        scheduledFor.setDate(scheduledFor.getDate() + 1);
      }
    } else if (scheduleType === "dayOfWeek" && dayOfWeek !== undefined) {
      scheduledDayOfWeek = parseInt(dayOfWeek);
      scheduledFor = getNextDayOfWeek(scheduledDayOfWeek);
    }

    if (!scheduledFor) {
      return res.status(400).json({ error: "Invalid schedule parameters" });
    }

    const scheduledEmails = [];

    for (const recipient of recipients) {
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
        status: "scheduled",
        scheduledFor,
        scheduledType: scheduleType,
        scheduledDayOfWeek,
        recipients: [
          {
            email: recipient,
            status: "pending",
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
      scheduledEmails.push(dbEmail);
    }

    res.json({
      message: "Emails scheduled successfully",
      scheduledFor,
      emails: scheduledEmails,
    });
  } catch (err) {
    console.error("Schedule email error:", err);
    res.status(500).json({ error: "Failed to schedule emails" });
  }
});

// Get scheduled emails
router.get("/scheduled", auth, async (req, res) => {
  try {
    const scheduledEmails = await Email.find({
      userId: req.user.id,
      status: "scheduled",
    })
      .sort({ scheduledFor: 1 })
      .exec();

    res.json(scheduledEmails);
  } catch (err) {
    console.error("Get scheduled emails error:", err);
    res.status(500).json({ error: "Failed to fetch scheduled emails" });
  }
});

// Cancel scheduled email
router.delete("/cancel/:id", auth, async (req, res) => {
  try {
    const email = await Email.findOne({
      _id: req.params.id,
      userId: req.user.id,
      status: "scheduled",
    });

    if (!email) {
      return res.status(404).json({ error: "Scheduled email not found" });
    }

    await Email.deleteOne({ _id: req.params.id });
    res.json({ message: "Scheduled email cancelled" });
  } catch (err) {
    console.error("Cancel scheduled email error:", err);
    res.status(500).json({ error: "Failed to cancel scheduled email" });
  }
});

// Helper function to get next occurrence of a day of week
function getNextDayOfWeek(dayOfWeek) {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;

  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  targetDate.setHours(9, 0, 0, 0); // Default to 9 AM

  return targetDate;
}

module.exports = router;


