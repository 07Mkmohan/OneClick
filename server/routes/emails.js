const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
const APP_URL = process.env.APP_URL || `http://localhost:3000`;

function enrichEmail(email) {
  const viewCount = email.viewers?.length || 0;
  const uniqueViewers = [...new Set(email.viewers?.map((v) => v.user))] || [];
  const linkClicks =
    email.tracking?.clicks?.reduce((sum, c) => sum + c.count, 0) || 0;
  return { ...email.toObject(), viewCount, uniqueViewers, linkClicks };
}

// Get emails by folder
router.get("/:folder", auth, async (req, res) => {
  try {
    const { folder } = req.params;
    const emails = await Email.find({ folder, userId: req.user.id }).sort({ time: -1 });
    res.json(emails.map(enrichEmail));
  } catch (err) {
    console.error("GET /emails error:", err);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// Send new email (single or bulk)
router.post("/", auth, upload.array("files"), async (req, res) => {
  try {
    const { to, subject, body, category, from, bulkRecipients } = req.body;
    const files = (req.files || []).map((f) => f.filename);
    const recipients = bulkRecipients ? JSON.parse(bulkRecipients) : [to];
    const emailsSent = [];

    for (const recipient of recipients) {
      const dbEmail = new Email({
        to: recipient,
        from: from || process.env.EMAIL_USER,
        subject,
        body,
        category,
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
          { sender: from || "Me", body, time: new Date(), files, category },
        ],
      });
      await dbEmail.save();

      // Track unique recipient
      try {
        const uniqueRecipient = await UniqueRecipient.findOneAndUpdate(
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

      // Create tracking pixel URL - ensure it's accessible
      const trackingPixelUrl = `${BACKEND_URL}/api/track/open/${dbEmail._id}?recipient=${encodeURIComponent(recipient)}`;
      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;
      
      // Track links in body
      const trackedBody = body.replace(
        /(https?:\/\/[^\s<>"']+)/gi,
        (url) =>
          `<a href="${BACKEND_URL}/api/track/click/${dbEmail._id}?url=${encodeURIComponent(url)}&recipient=${encodeURIComponent(recipient)}" target="_blank">${url}</a>`
      );

      // Convert plain text to HTML if needed
      const htmlBody = body.includes('<') ? trackedBody : trackedBody.replace(/\n/g, '<br>');

      console.log(`[EMAIL SEND] Sending to ${recipient}, Tracking URL: ${trackingPixelUrl}`);

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
      
      console.log(`[EMAIL SEND] Email sent successfully to ${recipient}`);

      emailsSent.push(dbEmail);
    }

    res.json({ message: "Emails sent", emails: emailsSent.map(enrichEmail) });
  } catch (err) {
    console.error("POST /emails error:", err);
    res.status(500).json({ error: "Failed to send email(s)" });
  }
});

// Reply to email
router.post("/reply/:id", auth, upload.array("files"), async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const files = (req.files || []).map((f) => f.filename);
    const email = await Email.findOne({ _id: id, userId: req.user.id });
    if (!email) return res.status(404).json({ error: "Email not found" });

    email.thread.push({
      sender: "Me",
      body,
      time: new Date(),
      files,
      category: email.category || "Primary",
    });
    await email.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email.from || email.to,
      subject: `Re: ${email.subject}`,
      text: body,
      attachments: files.map((f) => ({
        filename: f,
        path: path.join(__dirname, "../uploads", f),
      })),
    });

    res.json(enrichEmail(email));
  } catch (err) {
    console.error("POST /emails/reply error:", err);
    res.status(500).json({ error: "Failed to reply" });
  }
});

// Track email view
router.post("/view/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;
    const email = await Email.findOne({ _id: id, userId: req.user.id });
    if (!email) return res.status(404).json({ error: "Email not found" });

    const isInternal = user === process.env.EMAIL_USER;
    email.viewers.push({
      user: user || "Anonymous",
      internal: !!isInternal,
      time: new Date(),
    });
    await email.save();

    res.json(enrichEmail(email));
  } catch (err) {
    console.error("POST /emails/view error:", err);
    res.status(500).json({ error: "Failed to track view" });
  }
});

// Delete, restore, permanent delete
router.put("/delete/:id", auth, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id });
    if (!email) return res.status(404).json({ error: "Email not found" });
    email.folder = "Trash";
    await email.save();
    res.json(enrichEmail(email));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.put("/restore/:id", auth, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id });
    if (!email) return res.status(404).json({ error: "Email not found" });
    email.folder =
      email.from === "Me" || email.from === process.env.EMAIL_USER
        ? "Sent"
        : "Inbox";
    await email.save();
    res.json(enrichEmail(email));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to restore" });
  }
});

router.delete("/trash/:id", auth, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, userId: req.user.id });
    if (!email) return res.status(404).json({ error: "Email not found" });

    email.files.forEach(
      (f) =>
        fs.existsSync(path.join(__dirname, "../uploads", f)) &&
        fs.unlinkSync(path.join(__dirname, "../uploads", f))
    );
    email.thread.forEach((msg) =>
      msg.files?.forEach(
        (f) =>
          fs.existsSync(path.join(__dirname, "../uploads", f)) &&
          fs.unlinkSync(path.join(__dirname, "../uploads", f))
      )
    );

    await Email.deleteOne({ _id: req.params.id });
    res.json({ message: "Email permanently deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to permanently delete" });
  }
});

module.exports = router;
