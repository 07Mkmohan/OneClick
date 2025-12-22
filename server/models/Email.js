const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema({
  to: String,
  from: String,
  subject: String,
  body: String,
  category: String,
  files: [String],
  folder: { type: String, default: "Inbox" },
  unread: { type: Boolean, default: true },
  time: { type: Date, default: Date.now },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  scheduledFor: Date,
  scheduledType: {
    type: String,
    enum: ["date", "time", "dayOfWeek", null],
    default: null,
  },
  scheduledDayOfWeek: Number, // 0-6 (Sunday-Saturday)
  status: {
    type: String,
    enum: ["sent", "scheduled", "failed"],
    default: "sent",
  },
  thread: [
    {
      sender: String,
      body: String,
      time: Date,
      files: [String],
      category: String,
    },
  ],
  tracking: {
    opens: { type: Number, default: 0 },
    uniqueOpens: { type: [String], default: [] },
    clicks: [{ url: String, count: { type: Number, default: 0 } }],
    recipientClicks: [
      {
        recipient: String,
        url: String,
        count: { type: Number, default: 0 },
      },
    ],
  },
  viewers: [{ user: String, internal: Boolean, time: Date }],
  recipients: [
    {
      email: String,
      status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
      opened: { type: Boolean, default: false },
      clicked: { type: Boolean, default: false },
      clickCount: { type: Number, default: 0 },
    },
  ],
  replied: { type: Boolean, default: false },
  replyFrom: String,
  replyTime: Date,
  replyBody: String,
  originalEmailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Email",
    default: null,
  },
});

module.exports = mongoose.model("Email", emailSchema);
