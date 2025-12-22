require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

// Import routes
const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/emails");
const trackingRoutes = require("./routes/tracking");
const csvRoutes = require("./routes/csv");
const schedulingRoutes = require("./routes/scheduling");
const dashboardRoutes = require("./routes/dashboard");

// Import scheduler
const { startScheduler } = require("./services/scheduler");

// Import models
const Email = require("./models/Email");
const UniqueRecipient = require("./models/UniqueRecipient");

// Tracking helpers
const { markOpen } = require("./utils/trackingHelpers");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/emailApp")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Helper function for enriching email data
function enrichEmail(email) {
  const viewCount = email.viewers?.length || 0;
  const uniqueViewers = [...new Set(email.viewers?.map((v) => v.user))] || [];
  const linkClicks =
    email.tracking?.clicks?.reduce((sum, c) => sum + c.count, 0) || 0;
  return { ...email.toObject(), viewCount, uniqueViewers, linkClicks };
}

// Set Socket.IO instance for tracking routes
trackingRoutes.setIO(io);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/track", trackingRoutes);
app.use("/api/csv", csvRoutes);
app.use("/api/schedule", schedulingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", require("./routes/admin"));

// IMAP watcher for incoming emails
const imapConfig = {
  imap: {
    user: process.env.IMAP_USER || process.env.EMAIL_USER,
    password: process.env.IMAP_PASS || process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: parseInt(process.env.IMAP_PORT || "993", 10),
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

async function startImapWatcher() {
  if (!imapConfig.imap.user || !imapConfig.imap.password) return;

  try {
    const connection = await imaps.connect(imapConfig);
    await connection.openBox("INBOX");

    const fetchUnseen = async () => {
      const results = await connection.search(["UNSEEN"], {
        bodies: [""],
        markSeen: false,
      });
      for (const res of results) {
        const raw = res.parts.map((p) => p.body).join("");
        const parsed = await simpleParser(raw);
        await saveIncomingEmail(parsed);
      }
    };

    async function saveIncomingEmail(parsed) {
      const files = (parsed.attachments || []).map((att) => att.filename || "");
      const fromStr =
        parsed.from?.value?.[0]?.address || parsed.from?.text || "unknown";
      const toStr =
        parsed.to?.value?.map((v) => v.address).join(", ") ||
        parsed.to?.text ||
        "";
      
      const subject = parsed.subject || "(no subject)";
      const isReply = subject.toLowerCase().startsWith("re:") || subject.toLowerCase().startsWith("re :");
      
      // Try to find original email this is replying to
      let originalEmail = null;
      if (isReply) {
        // Extract original subject (remove "Re:" prefix)
        const originalSubject = subject.replace(/^re:\s*/i, "").trim();
        // Find email sent to this sender with matching subject
        originalEmail = await Email.findOne({
          to: fromStr,
          subject: { $regex: new RegExp(originalSubject, "i") },
          folder: "Sent",
        }).sort({ time: -1 });
      }

      const inboxEmail = new Email({
        to: toStr,
        from: fromStr,
        subject: subject,
        body: parsed.text || parsed.html || "",
        category: "Primary",
        files,
        folder: "Inbox",
        unread: true,
        time: parsed.date || new Date(),
        userId: originalEmail?.userId || null,
        status: "sent",
        replied: false,
        thread: [
          {
            sender: fromStr,
            body: parsed.text || parsed.html || "",
            time: parsed.date || new Date(),
            files,
            category: "Primary",
          },
        ],
      });

      await inboxEmail.save();

      // If this is a reply, update the original email
      if (isReply && originalEmail) {
        originalEmail.replied = true;
        originalEmail.replyFrom = fromStr;
        originalEmail.replyTime = parsed.date || new Date();
        originalEmail.replyBody = parsed.text || parsed.html || "";

        // Mark email as opened when recipient replies (reply = opened)
        const { markOpen } = require("./utils/trackingHelpers");
        const replyOpenResult = await markOpen({
          email: originalEmail,
          recipientEmail: fromStr,
          source: "reply",
          forceIncrement: true, // Always increment on reply
        });

        await originalEmail.save();
        
        // Update unique recipient reply status AND open count
        if (originalEmail.userId) {
          try {
            await UniqueRecipient.findOneAndUpdate(
              { userId: originalEmail.userId, recipientEmail: fromStr },
              {
                $set: {
                  hasReplied: true,
                  lastReplyTime: parsed.date || new Date(),
                },
                $inc: { totalOpens: 1 },
              }
            );
          } catch (err) {
            console.error("Error updating unique recipient reply status:", err);
          }
        }
        
        console.log(`✓✓✓ Reply received from ${fromStr} for email: ${originalEmail.subject}`);

        // Emit both opened and replied events
        if (replyOpenResult?.wasNewOpen || replyOpenResult) {
          io.emit("email-opened", {
            emailId: originalEmail._id.toString(),
            userId: originalEmail.userId?.toString(),
            recipient: fromStr,
            opens: originalEmail.tracking?.opens || 0,
            uniqueOpens: originalEmail.tracking?.uniqueOpens?.length || 0,
            openedCount: originalEmail.recipients?.filter((r) => r.opened).length || 0,
            source: "reply",
            wasNewOpen: true,
          });
        }

        io.emit("email-replied", {
          originalEmailId: originalEmail._id,
          replyFrom: fromStr,
          replyTime: originalEmail.replyTime,
          replySnippet: (parsed.text || parsed.html || "").slice(0, 240),
          replySubject: originalEmail.subject,
        });
      } else if (isReply) {
        // Try alternative matching - check if any email was sent to this sender
        const alternativeMatch = await Email.findOne({
          to: fromStr,
          folder: "Sent",
        }).sort({ time: -1 });
        
        if (alternativeMatch) {
          alternativeMatch.replied = true;
          alternativeMatch.replyFrom = fromStr;
          alternativeMatch.replyTime = parsed.date || new Date();
          alternativeMatch.replyBody = parsed.text || parsed.html || "";

          // Mark email as opened when recipient replies
          const { markOpen } = require("./utils/trackingHelpers");
          const replyOpenResult = await markOpen({
            email: alternativeMatch,
            recipientEmail: fromStr,
            source: "reply",
            forceIncrement: true,
          });

          await alternativeMatch.save();
          
          if (alternativeMatch.userId) {
            try {
              await UniqueRecipient.findOneAndUpdate(
                { userId: alternativeMatch.userId, recipientEmail: fromStr },
                {
                  $set: {
                    hasReplied: true,
                    lastReplyTime: parsed.date || new Date(),
                  },
                  $inc: { totalOpens: 1 },
                }
              );
            } catch (err) {
              console.error("Error updating unique recipient reply status:", err);
            }
          }
          
          console.log(`✓✓✓ Reply received from ${fromStr} (matched by recipient)`);

          // Emit both opened and replied events
          if (replyOpenResult?.wasNewOpen || replyOpenResult) {
            io.emit("email-opened", {
              emailId: alternativeMatch._id.toString(),
              userId: alternativeMatch.userId?.toString(),
              recipient: fromStr,
              opens: alternativeMatch.tracking?.opens || 0,
              uniqueOpens: alternativeMatch.tracking?.uniqueOpens?.length || 0,
              openedCount: alternativeMatch.recipients?.filter((r) => r.opened).length || 0,
              source: "reply",
              wasNewOpen: true,
            });
          }

          io.emit("email-replied", {
            originalEmailId: alternativeMatch._id,
            replyFrom: fromStr,
            replyTime: alternativeMatch.replyTime,
            replySnippet: (parsed.text || parsed.html || "").slice(0, 240),
            replySubject: alternativeMatch.subject,
          });
        }
      }

      io.emit("new-email", enrichEmail(inboxEmail));
    }

    connection.on("mail", async () => {
      const results = await connection.search(["UNSEEN"], {
        bodies: [""],
        markSeen: false,
      });
      for (const res of results) {
        const raw = res.parts.map((p) => p.body).join("");
        const parsed = await simpleParser(raw);
        await saveIncomingEmail(parsed);
        if (res.attributes?.uid)
          try {
            await connection.addFlags(res.attributes.uid, "\\Seen");
          } catch {}
      }
    });

    await fetchUnseen();
  } catch (err) {
    console.error("IMAP watcher failed:", err);
  }
}

startImapWatcher().catch(console.error);

// Socket.IO
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  
  // Emit tracking updates when emails are opened
  socket.on("tracking-update", (data) => {
    io.emit("email-opened", data);
  });
  
  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

// Start email scheduler
startScheduler();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});
