const express = require("express");
const router = express.Router();
const Email = require("../models/Email");
const { markOpen, markClick } = require("../utils/trackingHelpers");

// Get Socket.IO instance (will be set by server.js)
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

// Track email open (tracking pixel)
router.get("/open/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const recipient = req.query.recipient;
    
    console.log(`[TRACKING] Open request - Email ID: ${id}, Recipient: ${recipient}`);
    
    const email = await Email.findById(id);
    
    if (!email) {
      console.warn(`[TRACKING] Email not found: ${id}`);
    } else {
      const recipientEmail = recipient || email.to;

      const { wasNewOpen } = await markOpen({
        email,
        recipientEmail,
        source: "pixel",
        forceIncrement: true,
      });
      
      await email.save();
      
      console.log(`✓✓✓ [TRACKING SUCCESS] Email opened by: ${recipientEmail} (Email ID: ${id})`);
      console.log(`   Total opens: ${email.tracking.opens}, Unique opens: ${email.tracking.uniqueOpens.length}`);
      console.log(`   Recipients opened: ${email.recipients.filter((r) => r.opened).length}`);
      
      // Emit real-time update via Socket.IO
      if (ioInstance) {
        ioInstance.emit("email-opened", {
          emailId: email._id.toString(),
          userId: email.userId?.toString(),
          recipient: recipientEmail,
          opens: email.tracking.opens,
          uniqueOpens: email.tracking.uniqueOpens.length,
          openedCount: email.recipients.filter((r) => r.opened).length,
          source: "pixel",
          wasNewOpen,
        });
        console.log(`   [SOCKET] Emitted email-opened event`);
      }
    }

    // Return 1x1 transparent pixel with CORS headers
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": pixel.length,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    });
    res.end(pixel);
  } catch (err) {
    console.error("Track open error:", err);
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(pixel);
  }
});

// Track link click
router.get("/click/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { url, recipient } = req.query;
    
    if (!url) {
      return res.redirect("/");
    }

    const email = await Email.findById(id);
    if (email) {
      const recipientEmail = recipient || email.to;

      const { wasNewOpen } = await markClick({
        email,
        recipientEmail,
        url,
      });

      await email.save();
      
      if (ioInstance) {
        ioInstance.emit("email-clicked", {
          emailId: email._id.toString(),
          userId: email.userId?.toString(),
          recipient: recipientEmail,
          url,
          totalClicks: email.tracking.clicks?.reduce((sum, c) => sum + c.count, 0) || 0,
          clickedCount: email.recipients.find((r) => r.email === recipientEmail)?.clickCount || 0,
        });

        if (wasNewOpen) {
          ioInstance.emit("email-opened", {
            emailId: email._id.toString(),
            userId: email.userId?.toString(),
            recipient: recipientEmail,
            opens: email.tracking.opens,
            uniqueOpens: email.tracking.uniqueOpens.length,
            openedCount: email.recipients.filter((r) => r.opened).length,
            source: "click",
            wasNewOpen,
          });
        }
      }
    }

    // Redirect to original URL
    res.redirect(url);
  } catch (err) {
    console.error("Track click error:", err);
    const url = req.query.url || "/";
    res.redirect(url);
  }
});

module.exports = router;
module.exports.setIO = setIO;

