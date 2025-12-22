const UniqueRecipient = require("../models/UniqueRecipient");

function ensureTrackingStructure(email) {
  if (!email.tracking) {
    email.tracking = {
      opens: 0,
      uniqueOpens: [],
      clicks: [],
      recipientClicks: [],
    };
  }

  if (!Array.isArray(email.tracking.uniqueOpens)) {
    email.tracking.uniqueOpens = [];
  }

  if (!Array.isArray(email.tracking.clicks)) {
    email.tracking.clicks = [];
  }

  if (!Array.isArray(email.tracking.recipientClicks)) {
    email.tracking.recipientClicks = [];
  }

  if (!Array.isArray(email.recipients)) {
    email.recipients = [];
  }
}

function getRecipientRecord(email, recipientEmail) {
  ensureTrackingStructure(email);

  let recipientRecord = email.recipients.find(
    (r) => r.email?.toLowerCase() === recipientEmail.toLowerCase()
  );

  if (!recipientRecord) {
    recipientRecord = {
      email: recipientEmail,
      status: "sent",
      opened: false,
      clicked: false,
      clickCount: 0,
    };
    email.recipients.push(recipientRecord);
  }

  return recipientRecord;
}

async function markOpen({ email, recipientEmail, source = "pixel", forceIncrement = false }) {
  if (!email || !recipientEmail) {
    return { email, wasNewOpen: false };
  }

  ensureTrackingStructure(email);

  const recipientRecord = getRecipientRecord(email, recipientEmail);
  const alreadyOpened = Boolean(recipientRecord.opened);

  if (!alreadyOpened) {
    recipientRecord.opened = true;
    recipientRecord.openSource = source;
    recipientRecord.openedAt = new Date();
  }

  if (forceIncrement || !alreadyOpened) {
    email.tracking.opens = (email.tracking.opens || 0) + 1;
  }

  if (!email.tracking.uniqueOpens.includes(recipientEmail)) {
    email.tracking.uniqueOpens.push(recipientEmail);
  }

  if (email.userId && (!alreadyOpened || forceIncrement)) {
    try {
      await UniqueRecipient.findOneAndUpdate(
        { userId: email.userId, recipientEmail },
        {
          $setOnInsert: { firstEmailTime: email.time || new Date() },
          $set: { lastEmailTime: new Date() },
          $inc: { totalOpens: 1 },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("[Tracking] Failed to update unique recipient open count:", err.message);
    }
  }

  return { email, wasNewOpen: !alreadyOpened };
}

async function markClick({ email, recipientEmail, url }) {
  if (!email || !recipientEmail || !url) {
    return { email, wasNewOpen: false };
  }

  ensureTrackingStructure(email);

  // Track aggregate link stats
  let linkEntry = email.tracking.clicks.find((entry) => entry.url === url);
  if (!linkEntry) {
    linkEntry = { url, count: 1 };
    email.tracking.clicks.push(linkEntry);
  } else {
    linkEntry.count += 1;
  }

  // Track recipient-specific clicks
  let recipientClick = email.tracking.recipientClicks.find(
    (entry) => entry.recipient === recipientEmail && entry.url === url
  );
  if (!recipientClick) {
    recipientClick = { recipient: recipientEmail, url, count: 1 };
    email.tracking.recipientClicks.push(recipientClick);
  } else {
    recipientClick.count += 1;
  }

  const recipientRecord = getRecipientRecord(email, recipientEmail);
  recipientRecord.clicked = true;
  recipientRecord.clickCount = (recipientRecord.clickCount || 0) + 1;
  recipientRecord.lastClickedAt = new Date();

  const { wasNewOpen } = await markOpen({
    email,
    recipientEmail,
    source: "click",
    forceIncrement: false,
  });

  if (email.userId) {
    try {
      await UniqueRecipient.findOneAndUpdate(
        { userId: email.userId, recipientEmail },
        {
          $setOnInsert: { firstEmailTime: email.time || new Date() },
          $set: { lastEmailTime: new Date() },
          $inc: { totalClicks: 1 },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("[Tracking] Failed to update unique recipient click count:", err.message);
    }
  }

  return { email, wasNewOpen };
}

module.exports = {
  ensureTrackingStructure,
  markOpen,
  markClick,
};

