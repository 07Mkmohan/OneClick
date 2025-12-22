const mongoose = require("mongoose");

// Track unique recipient-user pairs
const uniqueRecipientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
  },
  firstEmailTime: {
    type: Date,
    default: Date.now,
  },
  lastEmailTime: {
    type: Date,
    default: Date.now,
  },
  totalEmailsSent: {
    type: Number,
    default: 1,
  },
  totalOpens: {
    type: Number,
    default: 0,
  },
  totalClicks: {
    type: Number,
    default: 0,
  },
  hasReplied: {
    type: Boolean,
    default: false,
  },
  lastReplyTime: Date,
});

// Compound index to ensure uniqueness
uniqueRecipientSchema.index({ userId: 1, recipientEmail: 1 }, { unique: true });

module.exports = mongoose.model("UniqueRecipient", uniqueRecipientSchema);


