const express = require("express");
const router = express.Router();
const Email = require("../models/Email");
const UniqueRecipient = require("../models/UniqueRecipient");
const auth = require("../middleware/auth");

// Get dashboard statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalEmails = await Email.countDocuments({ userId });
    const sentEmails = await Email.countDocuments({ userId, folder: "Sent" });
    const scheduledEmails = await Email.countDocuments({
      userId,
      status: "scheduled",
    });
    const uniqueRecipientsCount = await UniqueRecipient.countDocuments({ userId });

    const emailsWithTracking = await Email.find({
      userId,
      folder: "Sent",
    }).select("tracking recipients");

    let totalOpens = 0;
    let totalClicks = 0;
    let totalRecipients = 0;
    let openedRecipients = 0;
    let clickedRecipients = 0;

    emailsWithTracking.forEach((email) => {
      totalOpens += email.tracking?.opens || 0;
      totalClicks +=
        email.tracking?.clicks?.reduce((sum, c) => sum + (c.count || 0), 0) || 0;
      totalRecipients += email.recipients?.length || 1;
      
      // Check both sources for opened status
      const openedFromTracking = email.tracking?.uniqueOpens?.length || 0;
      const openedFromRecipients = email.recipients?.filter((r) => r.opened === true).length || 0;
      openedRecipients += Math.max(openedFromTracking, openedFromRecipients);
      
      clickedRecipients +=
        email.recipients?.filter((r) => r.clicked === true).length || 0;
    });

    res.json({
      totalEmails,
      sentEmails,
      scheduledEmails,
      uniqueRecipientsCount,
      totalOpens,
      totalClicks,
      totalRecipients,
      openedRecipients,
      clickedRecipients,
      openRate: totalRecipients > 0 ? (openedRecipients / totalRecipients) * 100 : 0,
      clickRate: totalRecipients > 0 ? (clickedRecipients / totalRecipients) * 100 : 0,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

// Get all sent emails with tracking details
router.get("/sent-emails", auth, async (req, res) => {
  try {
    const emails = await Email.find({
      userId: req.user.id,
      folder: "Sent",
    })
      .sort({ time: -1 })
      .select("to from subject time tracking recipients status scheduledFor")
      .exec();

    const enrichedEmails = emails.map((email) => {
      const recipientCount = email.recipients?.length || 1;
      
      // Get opened count from multiple sources for accuracy
      const openedFromRecipients = email.recipients?.filter((r) => r.opened === true).length || 0;
      const openedFromTracking = email.tracking?.uniqueOpens?.length || 0;
      const totalOpens = email.tracking?.opens || 0;
      
      // Use the most reliable source - prioritize uniqueOpens as it's updated by tracking pixel
      const openedCount = openedFromTracking > 0 ? openedFromTracking : openedFromRecipients;
      
      const clickedCount = email.recipients?.filter((r) => r.clicked === true).length || 0;
      const totalClicks =
        email.tracking?.clicks?.reduce((sum, c) => sum + (c.count || 0), 0) || 0;

      return {
        _id: email._id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        time: email.time,
        scheduledFor: email.scheduledFor,
        status: email.status,
        recipientCount,
        openedCount,
        clickedCount,
        totalOpens,
        totalClicks,
        recipients: email.recipients || [],
        uniqueOpens: email.tracking?.uniqueOpens || [],
        hasOpened: openedCount > 0, // Boolean flag for easy checking
      };
    });

    res.json(enrichedEmails);
  } catch (err) {
    console.error("Get sent emails error:", err);
    res.status(500).json({ error: "Failed to fetch sent emails" });
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
      .select("to from subject scheduledFor scheduledType scheduledDayOfWeek recipients")
      .exec();

    // Enrich scheduled emails with formatted date/time info
    const enrichedScheduled = scheduledEmails.map((email) => {
      const scheduledDate = email.scheduledFor ? new Date(email.scheduledFor) : null;
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      let scheduleDisplay = {
        day: null,
        date: null,
        time: null,
        fullDateTime: null,
        type: email.scheduledType || "N/A",
      };

      if (scheduledDate) {
        scheduleDisplay.day = dayNames[scheduledDate.getDay()];
        scheduleDisplay.date = scheduledDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        scheduleDisplay.time = scheduledDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        scheduleDisplay.fullDateTime = scheduledDate.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } else if (email.scheduledDayOfWeek !== undefined && email.scheduledDayOfWeek !== null) {
        scheduleDisplay.day = dayNames[email.scheduledDayOfWeek];
        scheduleDisplay.type = "Recurring Weekly";
        scheduleDisplay.date = `Every ${dayNames[email.scheduledDayOfWeek]}`;
        scheduleDisplay.time = "09:00 AM"; // Default time for weekly
      }

      return {
        ...email.toObject(),
        scheduleDisplay,
      };
    });

    res.json(enrichedScheduled);
  } catch (err) {
    console.error("Get scheduled emails error:", err);
    res.status(500).json({ error: "Failed to fetch scheduled emails" });
  }
});

// Get replied emails
router.get("/replied", auth, async (req, res) => {
  try {
    const repliedEmails = await Email.find({
      userId: req.user.id,
      replied: true,
      folder: "Sent",
    })
      .sort({ replyTime: -1 })
      .select("to from subject time replyFrom replyTime replyBody recipients tracking")
      .exec();

    const enrichedReplied = repliedEmails.map((email) => {
      const recipientCount = email.recipients?.length || 1;
      const openedCount = email.recipients?.filter((r) => r.opened).length || 0;
      const clickedCount = email.recipients?.filter((r) => r.clicked).length || 0;

      return {
        _id: email._id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        time: email.time,
        replyFrom: email.replyFrom,
        replyTime: email.replyTime,
        replyBody: email.replyBody,
        recipientCount,
        openedCount,
        clickedCount,
        totalOpens: email.tracking?.opens || 0,
        totalClicks: email.tracking?.clicks?.reduce((sum, c) => sum + c.count, 0) || 0,
      };
    });

    res.json(enrichedReplied);
  } catch (err) {
    console.error("Get replied emails error:", err);
    res.status(500).json({ error: "Failed to fetch replied emails" });
  }
});

// Get unique recipients (for counting)
router.get("/unique-recipients", auth, async (req, res) => {
  try {
    const uniqueRecipients = await UniqueRecipient.find({
      userId: req.user.id,
    })
      .sort({ lastEmailTime: -1 })
      .exec();

    res.json(uniqueRecipients);
  } catch (err) {
    console.error("Get unique recipients error:", err);
    res.status(500).json({ error: "Failed to fetch unique recipients" });
  }
});

// Get emails for a specific recipient
router.get("/recipient-emails/:recipientEmail", auth, async (req, res) => {
  try {
    const { recipientEmail } = req.params;
    const decodedEmail = decodeURIComponent(recipientEmail);

    const emails = await Email.find({
      userId: req.user.id,
      to: decodedEmail,
      folder: "Sent",
    })
      .sort({ time: -1 })
      .select("to from subject time tracking recipients status replied replyFrom replyTime")
      .exec();

    const enrichedEmails = emails.map((email) => {
      const openedFromTracking = email.tracking?.uniqueOpens?.length || 0;
      const openedFromRecipients = email.recipients?.filter((r) => r.opened === true).length || 0;
      const openedCount = openedFromTracking > 0 ? openedFromTracking : openedFromRecipients;

      return {
        _id: email._id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        time: email.time,
        status: email.status,
        openedCount,
        totalOpens: email.tracking?.opens || 0,
        clickedCount: email.recipients?.filter((r) => r.clicked === true).length || 0,
        totalClicks: email.tracking?.clicks?.reduce((sum, c) => sum + (c.count || 0), 0) || 0,
        replied: email.replied || false,
        replyFrom: email.replyFrom,
        replyTime: email.replyTime,
        hasOpened: openedCount > 0,
      };
    });

    res.json(enrichedEmails);
  } catch (err) {
    console.error("Get recipient emails error:", err);
    res.status(500).json({ error: "Failed to fetch recipient emails" });
  }
});

// Search emails
router.get("/search", auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.json({ sent: [], scheduled: [], recipients: [] });
    }

    const searchTerm = q.trim();
    const searchRegex = new RegExp(searchTerm, "i");
    const lowercaseTerm = searchTerm.toLowerCase();

    // Sent emails search
    const sentEmails = await Email.find({
      userId: req.user.id,
      folder: "Sent",
      $or: [
        { subject: searchRegex },
        { to: searchRegex },
        { from: searchRegex },
        { body: searchRegex },
        { "recipients.email": searchRegex },
      ],
    })
      .sort({ time: -1 })
      .limit(50)
      .select("to from subject time tracking recipients status clickedCount")
      .exec();

    const sentResults = sentEmails.map((email) => {
      const openedFromTracking = email.tracking?.uniqueOpens?.length || 0;
      const openedFromRecipients = email.recipients?.filter((r) => r.opened === true).length || 0;
      const openedCount = openedFromTracking > 0 ? openedFromTracking : openedFromRecipients;

      return {
        type: "sent",
        _id: email._id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        time: email.time,
        status: email.status,
        openedCount,
        totalOpens: email.tracking?.opens || 0,
        clickedCount: email.recipients?.filter((r) => r.clicked === true).length || 0,
        hasOpened: openedCount > 0,
      };
    });

    // Scheduled emails search
    const rawScheduled = await Email.find({
      userId: req.user.id,
      status: "scheduled",
    })
      .sort({ scheduledFor: 1 })
      .limit(50)
      .select("to from subject scheduledFor scheduledType scheduledDayOfWeek recipients")
      .exec();

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const scheduledResults = rawScheduled
      .filter((email) => {
        if (searchRegex.test(email.subject || "")) return true;
        if (searchRegex.test(email.to || "")) return true;
        if (searchRegex.test(email.from || "")) return true;

        const scheduleDisplayParts = [];
        if (email.scheduledFor) {
          const dateObj = new Date(email.scheduledFor);
          scheduleDisplayParts.push(dateObj.toLocaleDateString());
          scheduleDisplayParts.push(dateObj.toLocaleTimeString());
          scheduleDisplayParts.push(dayNames[dateObj.getDay()]);
        } else if (email.scheduledDayOfWeek !== undefined && email.scheduledDayOfWeek !== null) {
          scheduleDisplayParts.push(dayNames[email.scheduledDayOfWeek]);
        }

        return scheduleDisplayParts.some((part) =>
          part?.toLowerCase().includes(lowercaseTerm)
        );
      })
      .map((email) => {
        const scheduledDate = email.scheduledFor ? new Date(email.scheduledFor) : null;
        const scheduleDisplay = {
          day: scheduledDate ? dayNames[scheduledDate.getDay()] : email.scheduledDayOfWeek !== undefined
            ? dayNames[email.scheduledDayOfWeek]
            : "N/A",
          date: scheduledDate
            ? scheduledDate.toLocaleDateString()
            : email.scheduledDayOfWeek !== undefined
            ? `Every ${dayNames[email.scheduledDayOfWeek]}`
            : "N/A",
          time: scheduledDate
            ? scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Scheduled",
          type: email.scheduledType || "custom",
        };

        return {
          type: "scheduled",
          _id: email._id,
          to: email.to,
          from: email.from,
          subject: email.subject,
          scheduleDisplay,
          recipients: email.recipients || [],
        };
      });

    // Unique recipients search (acts as "search by name/email")
    const recipientMatches = await UniqueRecipient.find({
      userId: req.user.id,
      recipientEmail: searchRegex,
    })
      .sort({ lastEmailTime: -1 })
      .limit(50)
      .exec();

    const recipientResults = recipientMatches.map((recipient) => {
      const displayName = recipient.recipientEmail
        ? recipient.recipientEmail.split("@")[0].replace(/[._-]/g, " ")
        : recipient.recipientEmail;

      return {
        type: "recipient",
        _id: recipient._id,
        recipientEmail: recipient.recipientEmail,
        displayName: displayName ? displayName.replace(/\s+/g, " ").trim() : "",
        totalEmailsSent: recipient.totalEmailsSent || 0,
        totalOpens: recipient.totalOpens || 0,
        totalClicks: recipient.totalClicks || 0,
        hasReplied: recipient.hasReplied || false,
        lastReplyTime: recipient.lastReplyTime,
        firstEmailTime: recipient.firstEmailTime,
        lastEmailTime: recipient.lastEmailTime,
      };
    });

    res.json({
      sent: sentResults,
      scheduled: scheduledResults,
      recipients: recipientResults,
    });
  } catch (err) {
    console.error("Search emails error:", err);
    res.status(500).json({ error: "Failed to search emails" });
  }
});

module.exports = router;

