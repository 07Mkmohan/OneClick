// EmailUi.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { io } from "socket.io-client";
import {
  MdClose,
  MdSearch,
  MdReply,
  MdAttachFile,
  MdFiberManualRecord,
  MdDelete,
  MdRestore,
  MdArrowDownward,
  MdArrowUpward,
  MdAdd,
} from "react-icons/md";
import "./email.css";

const formatTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} h ago`;
  if (diffDays === 1) return "Yesterday";
  return new Date(date).toLocaleDateString();
};

function EmailUi() {
  const [inboxEmails, setInboxEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [draftEmails, setDraftEmails] = useState([]);
  const [trashEmails, setTrashEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    from: "",
    to: "",
    subject: "",
    body: "",
    category: "Primary",
    files: [],
    bulkRecipients: [],
  });
  const [replyBody, setReplyBody] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState("Inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [senderAccounts, setSenderAccounts] = useState([
    "mickeyminds07@gmail.com",
    "work@example.com",
    "other@example.com",
  ]);

  const composeRef = useRef(null);
  const API_BASE = "http://localhost:5000/api";
  const [csvPreview, setCsvPreview] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    scheduleType: "",
    scheduledDate: "",
    scheduledTime: "",
    dayOfWeek: "",
  });

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // Socket.IO: connect and listen for new-email events
  useEffect(() => {
    const socket = io(API_BASE);
    socket.on("connect", () => console.log("socket connected", socket.id));
    socket.on("new-email", (email) => {
      setInboxEmails((prev) => {
        if (prev.find((e) => e._id === email._id)) return prev;
        toast.info(`New email from ${email.from || "unknown"}`);
        return [email, ...prev];
      });
      setSelectedEmail((prevSelected) => {
        if (!prevSelected) return prevSelected;
        if (prevSelected._id === email._id) return email;
        return prevSelected;
      });
    });

    socket.on("disconnect", () => console.log("socket disconnected"));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!composeData.from && senderAccounts.length > 0) {
      setComposeData((prev) => ({ ...prev, from: senderAccounts[0] }));
    }
  }, [senderAccounts]);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const res = await axios.get(`${API_BASE}/emails/${currentFolder}`, {
          headers: getAuthHeaders(),
        });
        if (currentFolder === "Inbox") setInboxEmails(res.data);
        if (currentFolder === "Sent") setSentEmails(res.data);
        if (currentFolder === "Trash") setTrashEmails(res.data);
        if (currentFolder === "Drafts") setDraftEmails(res.data);
      } catch (err) {
        console.error("Failed to fetch emails:", err);
      }
    };
    fetchEmails();
  }, [currentFolder]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["from", "body", "to", "subject", "category"].includes(name))
      setComposeData((prev) => ({ ...prev, [name]: value }));
    if (name === "reply") setReplyBody(value);
    if (name === "categoryFilter") setCategoryFilter(value);
  };

  const handleDropFiles = (files, type) => {
    const arr = Array.from(files);
    if (type === "compose")
      setComposeData((prev) => ({ ...prev, files: [...prev.files, ...arr] }));
    if (type === "reply") setReplyFiles((prev) => [...prev, ...arr]);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDownloadFile = (file) => {
    if (typeof file === "string") {
      const url = `${API_BASE}/uploads/${file}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = file;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleRemoveFile = (index, type) => {
    if (type === "compose") {
      setComposeData((prev) => ({
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
      }));
    } else if (type === "reply") {
      setReplyFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("csv", file);

    try {
      const res = await axios.post(`${API_BASE}/csv/upload`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.errors && res.data.errors.length > 0) {
        toast.warning(`${res.data.errors.length} invalid emails found`);
      }

      setCsvPreview({
        total: res.data.total,
        valid: res.data.valid,
        invalid: res.data.invalid,
        emails: res.data.emails,
        errors: res.data.errors,
      });

      setComposeData((prev) => ({
        ...prev,
        bulkRecipients: res.data.emails,
      }));

      toast.success(`${res.data.valid} valid recipients loaded from CSV`);
    } catch (err) {
      console.error("CSV upload error:", err);
      toast.error("Failed to process CSV file");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (
      (!composeData.to && composeData.bulkRecipients.length === 0) ||
      !composeData.subject ||
      !composeData.body ||
      !composeData.from
    )
      return toast.error("Please fill all fields!");

    // Check if scheduling is enabled
    if (showSchedule && scheduleData.scheduleType) {
      return handleScheduleEmail();
    }

    const formData = new FormData();
    formData.append("from", composeData.from);
    formData.append("subject", composeData.subject);
    formData.append("body", composeData.body);
    formData.append("category", composeData.category);
    composeData.files.forEach((file) => formData.append("files", file));

    try {
      let res;
      if (composeData.bulkRecipients.length > 0) {
        formData.append(
          "recipients",
          JSON.stringify(composeData.bulkRecipients)
        );
        res = await axios.post(`${API_BASE}/csv/send-bulk`, formData, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success(`Bulk emails sent to ${res.data.sent} recipients`);
        if (res.data.failed > 0) {
          toast.warning(`${res.data.failed} emails failed to send`);
        }
      } else {
        formData.append("to", composeData.to);
        res = await axios.post(`${API_BASE}/emails`, formData, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        });
        setSentEmails([res.data.emails[0], ...sentEmails]);
        toast.success("Email sent successfully");
      }

      setComposeData({
        from: senderAccounts[0] || "",
        to: "",
        subject: "",
        body: "",
        category: "Primary",
        files: [],
        bulkRecipients: [],
      });
      setCsvPreview(null);
      setShowCompose(false);
      setShowSchedule(false);
    } catch (err) {
      console.error("Send failed:", err);
      toast.error("Failed to send email(s)");
    }
  };

  const handleScheduleEmail = async () => {
    if (!scheduleData.scheduleType) {
      return toast.error("Please select a schedule type");
    }

    const formData = new FormData();
    formData.append("from", composeData.from);
    formData.append("subject", composeData.subject);
    formData.append("body", composeData.body);
    formData.append("category", composeData.category);
    formData.append("scheduleType", scheduleData.scheduleType);
    composeData.files.forEach((file) => formData.append("files", file));

    if (composeData.bulkRecipients.length > 0) {
      formData.append(
        "bulkRecipients",
        JSON.stringify(composeData.bulkRecipients)
      );
    } else {
      formData.append("to", composeData.to);
    }

    if (scheduleData.scheduleType === "date") {
      formData.append("scheduledDate", scheduleData.scheduledDate);
      if (scheduleData.scheduledTime) {
        formData.append("scheduledTime", scheduleData.scheduledTime);
      }
    } else if (scheduleData.scheduleType === "time") {
      formData.append("scheduledTime", scheduleData.scheduledTime);
    } else if (scheduleData.scheduleType === "dayOfWeek") {
      formData.append("dayOfWeek", scheduleData.dayOfWeek);
    }

    try {
      const res = await axios.post(`${API_BASE}/schedule/schedule`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(
        `Email scheduled for ${new Date(
          res.data.scheduledFor
        ).toLocaleString()}`
      );
      setComposeData({
        from: senderAccounts[0] || "",
        to: "",
        subject: "",
        body: "",
        category: "Primary",
        files: [],
        bulkRecipients: [],
      });
      setCsvPreview(null);
      setShowCompose(false);
      setShowSchedule(false);
      setScheduleData({
        scheduleType: "",
        scheduledDate: "",
        scheduledTime: "",
        dayOfWeek: "",
      });
    } catch (err) {
      console.error("Schedule failed:", err);
      toast.error("Failed to schedule email");
    }
  };

  // ------------ Track Views when selecting email ------------
  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    if (email.unread) {
      email.unread = false;
      setInboxEmails([...inboxEmails]);
    }
    try {
      const res = await axios.post(
        `${API_BASE}/emails/view/${email._id}`,
        {
          user: composeData.from || "Anonymous",
        },
        {
          headers: getAuthHeaders(),
        }
      );
      setSelectedEmail((prev) => (prev ? { ...prev, ...res.data } : prev));
    } catch (err) {
      console.error("Failed to track view:", err);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() && replyFiles.length === 0) return;

    const formData = new FormData();
    formData.append("body", replyBody);
    replyFiles.forEach((f) => formData.append("files", f));

    try {
      const res = await axios.post(
        `${API_BASE}/emails/reply/${selectedEmail._id}`,
        formData,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setSelectedEmail(res.data);
      setReplyBody("");
      setReplyFiles([]);
      toast.success("Reply sent successfully");
    } catch (err) {
      console.error("Reply failed:", err);
      toast.error("Failed to send reply");
    }
  };

  const handleDelete = async (email) => {
    try {
      const res = await axios.put(
        `${API_BASE}/emails/delete/${email._id}`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      if (currentFolder === "Inbox")
        setInboxEmails(inboxEmails.filter((e) => e._id !== email._id));
      if (currentFolder === "Sent")
        setSentEmails(sentEmails.filter((e) => e._id !== email._id));
      setTrashEmails([res.data, ...trashEmails]);
      setSelectedEmail(null);
      toast.info("Email moved to Trash", { autoClose: 3000 });
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete email");
    }
  };

  const handleRestore = async (email) => {
    try {
      const res = await axios.put(
        `${API_BASE}/emails/restore/${email._id}`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );
      setTrashEmails(trashEmails.filter((e) => e._id !== email._id));
      if (res.data.from === "Me" || res.data.from === composeData.from)
        setSentEmails([res.data, ...sentEmails]);
      else setInboxEmails([res.data, ...inboxEmails]);
      toast.success("Email restored successfully");
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error("Failed to restore email");
    }
  };

  const handlePermanentDelete = async (email) => {
    try {
      await axios.delete(`${API_BASE}/emails/trash/${email._id}`, {
        headers: getAuthHeaders(),
      });
      setTrashEmails(trashEmails.filter((e) => e._id !== email._id));
      setSelectedEmail(null);
      toast.info("Email permanently deleted from Trash", { autoClose: 3000 });
    } catch (err) {
      console.error("Permanent delete failed:", err);
      toast.error("Failed to delete email");
    }
  };

  let displayedEmails =
    currentFolder === "Inbox"
      ? inboxEmails
      : currentFolder === "Sent"
      ? sentEmails
      : currentFolder === "Trash"
      ? trashEmails
      : draftEmails;

  if (showUnreadOnly && currentFolder === "Inbox")
    displayedEmails = displayedEmails.filter((e) => e.unread);

  if (categoryFilter !== "All" && currentFolder === "Inbox")
    displayedEmails = displayedEmails.filter(
      (e) => e.category === categoryFilter
    );

  displayedEmails = displayedEmails
    .filter(
      (email) =>
        email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (email.from || email.to || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      sortNewest
        ? new Date(b.time) - new Date(a.time)
        : new Date(a.time) - new Date(b.time)
    );

  // Removes quoted text, empty lines, and trims
  function cleanEmailBody(body) {
    if (!body) return "";
    return body
      .split("\n") // split into lines
      .filter((line) => !line.startsWith(">")) // remove quoted lines
      .filter((line) => !/On .* wrote:/.test(line)) // remove reply headers
      .filter((line) => line.trim() !== "") // remove empty lines
      .join("<br />"); // join with line breaks
  }

  function stripTrackingArtifacts(html) {
    if (!html) return "";
    let sanitized = html;

    // Remove tracking pixels
    sanitized = sanitized.replace(/<img[^>]*api\/track\/open[^>]*>/gi, "");

    // Replace tracked links with their original href
    sanitized = sanitized.replace(
      /href="[^"]*\/api\/track\/click\/[^"]*?url=([^"&]+)[^"]*"/gi,
      (_, encodedUrl) => {
        try {
          const original = decodeURIComponent(encodedUrl);
          return `href="${original}" target="_blank" rel="noopener noreferrer"`;
        } catch {
          return `href="${encodedUrl}" target="_blank" rel="noopener noreferrer"`;
        }
      }
    );

    // Remove inline onclick handlers that trigger tracking
    sanitized = sanitized.replace(/onclick="[^"]*"/gi, "");

    return sanitized;
  }

  function getSafeEmailHtml(body) {
    if (!body) return "";
    let sanitized = stripTrackingArtifacts(body);
    const hasHtmlTags = /<\/?[a-z][^>]*>/i.test(sanitized);

    if (!hasHtmlTags) {
      sanitized = cleanEmailBody(sanitized);
      sanitized = sanitized.replace(
        /(https?:\/\/[^\s]+)/g,
        (url) =>
          `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      );
    }

    return sanitized;
  }

  return (
    <div className="email-app">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <h2>Mail</h2>
        <ul>
          {["Inbox", "Sent", "Drafts", "Trash"].map((folder) => (
            <li
              key={folder}
              className={currentFolder === folder ? "active" : ""}
              onClick={() => {
                setCurrentFolder(folder);
                setSelectedEmail(null);
              }}
            >
              {folder}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="search-wrapper">
          <div className="search-bar">
            <MdSearch size={20} />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="sort-btn"
              onClick={() => setSortNewest(!sortNewest)}
            >
              {sortNewest ? <MdArrowDownward /> : <MdArrowUpward />}
            </button>
          </div>
          <select
            name="categoryFilter"
            value={categoryFilter}
            onChange={handleChange}
            className="category-dropdown"
          >
            <option value="All">All Categories</option>
            <option value="Primary">Primary</option>
            <option value="Social">Social</option>
            <option value="Promotions">Promotions</option>
          </select>
        </div>

        <div className="content-wrapper">
          {/* Email List */}
          <div className="email-list">
            {displayedEmails.map((email) => (
              <div
                key={email._id}
                className={`email-item ${
                  selectedEmail?._id === email._id ? "selected" : ""
                } ${email.category?.toLowerCase()}`}
              >
                <div onClick={() => handleSelectEmail(email)}>
                  <div className="email-sender">
                    {currentFolder === "Inbox" && email.unread && (
                      <MdFiberManualRecord
                        color="#1abc9c"
                        size={14}
                        style={{ marginRight: "4px" }}
                      />
                    )}
                    <span>
                      <strong>From:</strong> {email.from}
                    </span>
                    &nbsp;|&nbsp;
                    <span>
                      <strong>To:</strong> {email.to}
                    </span>
                    {/* Green tick if email opened by at least one recipient */}
                    {(email.tracking?.uniqueOpens?.length > 0 ||
                      (email.recipients &&
                        email.recipients.some((r) => r.opened))) && (
                      <span
                        className="recipient-open-tick"
                        title="Email opened by recipient"
                      >
                        ✓
                      </span>
                    )}
                    <span
                      className={`email-category ${email.category?.toLowerCase()}`}
                    >
                      {email.category}
                    </span>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-snippet">
                    {email.body?.substring(0, 40)}...
                  </div>
                  <div className="email-time">{formatTime(email.time)}</div>
                </div>
                {currentFolder !== "Trash" && (
                  <MdDelete
                    size={18}
                    className="delete-btn"
                    onClick={() => handleDelete(email)}
                  />
                )}
                {currentFolder === "Trash" && (
                  <>
                    <MdRestore
                      size={18}
                      className="restore-btn"
                      onClick={() => handleRestore(email)}
                    />
                    <MdDelete
                      size={18}
                      className="permanent-delete-btn"
                      title="Delete Permanently"
                      onClick={() => handlePermanentDelete(email)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Email Preview & Reply */}
          <div className="email-preview">
            {selectedEmail ? (
              <div className="email-content">
                {/* Header */}
                <div className="email-header">
                  <h2 className="email-subject">
                    {selectedEmail.subject}
                    {selectedEmail.viewCount > 0 && (
                      <span className="viewed-tick">✓</span>
                    )}
                  </h2>
                  <p className="email-from">
                    <strong>From:</strong> {selectedEmail.from}
                  </p>
                  <p className="email-to">
                    <strong>To:</strong> {selectedEmail.to}
                  </p>
                  <p className="email-time-header">
                    {formatTime(selectedEmail.time)}
                  </p>
                </div>

                {/* Thread */}
                <div className="email-thread">
                  {selectedEmail.thread?.map((msg, idx) => (
                    <div key={idx} className="thread-message-card">
                      <div className="thread-message-header">
                        <strong>{msg.sender}</strong>
                        {msg.category && (
                          <span
                            className={`email-category ${msg.category?.toLowerCase()}`}
                          >
                            {msg.category}
                          </span>
                        )}
                        <span className="thread-time">
                          {formatTime(msg.time)}
                        </span>
                      </div>

                      <div
                        className="thread-message-body"
                        dangerouslySetInnerHTML={{
                          __html: getSafeEmailHtml(msg.body),
                        }}
                      />

                      {msg.files?.length > 0 && (
                        <div className="thread-attachments">
                          {msg.files.map((file, i) => (
                            <span
                              key={i}
                              className="attached-file"
                              onClick={() => handleDownloadFile(file)}
                            >
                              <MdAttachFile className="attachment-icon" />
                              {file.name || file}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tracking Info */}
                <div className="tracking-info">
                  <p>
                    <strong>Views:</strong> {selectedEmail.viewCount || 0}
                  </p>
                  <p>
                    <strong>Unique Viewers:</strong>{" "}
                    {selectedEmail.viewers?.length || 0}
                  </p>
                  <p>
                    <strong>Link Clicks:</strong>{" "}
                    {selectedEmail.linkClicks || 0}
                  </p>
                </div>

                {/* Reply box */}
                <div className="reply-box">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyBody}
                    onChange={handleChange}
                    name="reply"
                  />
                  <div
                    className="drag-drop"
                    onDragOver={handleDragOver}
                    onDrop={(e) =>
                      handleDropFiles(e.dataTransfer.files, "reply")
                    }
                  >
                    <p>Drag & drop files here or click to attach</p>
                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        setReplyFiles([...replyFiles, ...e.target.files])
                      }
                    />
                  </div>

                  {replyFiles.length > 0 && (
                    <div className="file-preview">
                      {replyFiles.map((file, idx) => (
                        <div key={idx} className="file-item">
                          <span onClick={() => handleDownloadFile(file)}>
                            {file.name}
                          </span>
                          <button
                            className="remove-file-btn"
                            onClick={() => handleRemoveFile(idx, "reply")}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="reply-send-btn" onClick={handleReply}>
                    <MdReply /> Reply
                  </button>
                </div>
              </div>
            ) : (
              <p>Select an email to view</p>
            )}
          </div>
        </div>
      </main>

      {/* Compose Modal */}
      {showCompose && (
        <div className="compose-popup" ref={composeRef}>
          <div className="compose-header">
            <h2>Compose</h2>
            <button onClick={() => setShowCompose(false)}>
              <MdClose />
            </button>
          </div>
          <form onSubmit={handleSend}>
            <select
              name="from"
              value={composeData.from}
              onChange={handleChange}
            >
              {senderAccounts.map((acc, idx) => (
                <option key={idx} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="to"
              placeholder="To"
              value={composeData.to}
              onChange={handleChange}
            />
            <div style={{ margin: "10px 0" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Upload CSV for Bulk Emails
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                style={{ margin: "5px 0" }}
              />
              {csvPreview && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: "#f0f0f0",
                    borderRadius: "5px",
                  }}
                >
                  <p>
                    <strong>CSV Preview:</strong>
                  </p>
                  <p>
                    Total: {csvPreview.total} | Valid: {csvPreview.valid} |
                    Invalid: {csvPreview.invalid}
                  </p>
                  {csvPreview.emails.length > 0 && (
                    <div
                      style={{
                        maxHeight: "100px",
                        overflowY: "auto",
                        marginTop: "5px",
                      }}
                    >
                      <p>
                        <strong>
                          Valid Emails ({csvPreview.emails.length}):
                        </strong>
                      </p>
                      {csvPreview.emails.slice(0, 10).map((email, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: "inline-block",
                            margin: "2px",
                            padding: "2px 5px",
                            background: "#d4edda",
                            borderRadius: "3px",
                            fontSize: "0.85rem",
                          }}
                        >
                          {email}
                        </span>
                      ))}
                      {csvPreview.emails.length > 10 && (
                        <p>... and {csvPreview.emails.length - 10} more</p>
                      )}
                    </div>
                  )}
                  {csvPreview.errors && csvPreview.errors.length > 0 && (
                    <div style={{ marginTop: "5px", color: "#dc3545" }}>
                      <p>
                        <strong>Errors:</strong>
                      </p>
                      {csvPreview.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} style={{ fontSize: "0.85rem" }}>
                          Row {err.row}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              value={composeData.subject}
              onChange={handleChange}
            />
            <textarea
              name="body"
              placeholder="Type your message..."
              value={composeData.body}
              onChange={handleChange}
            />
            <select
              name="category"
              value={composeData.category}
              onChange={handleChange}
            >
              <option value="Primary">Primary</option>
              <option value="Social">Social</option>
              <option value="Promotions">Promotions</option>
            </select>
            <div
              className="drag-drop"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropFiles(e.dataTransfer.files, "compose")}
            >
              <p>Drag & drop files here or click to attach</p>
              <input
                type="file"
                multiple
                onChange={(e) =>
                  setComposeData((prev) => ({
                    ...prev,
                    files: [...prev.files, ...e.target.files],
                  }))
                }
              />
            </div>
            {composeData.files.length > 0 && (
              <div className="file-preview">
                {composeData.files.map((file, idx) => (
                  <div key={idx} className="file-item">
                    <span onClick={() => handleDownloadFile(file)}>
                      {file.name}
                    </span>
                    <button onClick={() => handleRemoveFile(idx, "compose")}>
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ margin: "10px 0" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="checkbox"
                  checked={showSchedule}
                  onChange={(e) => setShowSchedule(e.target.checked)}
                />
                Schedule Email
              </label>
            </div>

            {showSchedule && (
              <div
                style={{
                  margin: "10px 0",
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "5px",
                }}
              >
                <div className="form-group">
                  <label>Schedule Type</label>
                  <select
                    value={scheduleData.scheduleType}
                    onChange={(e) =>
                      setScheduleData({
                        ...scheduleData,
                        scheduleType: e.target.value,
                      })
                    }
                  >
                    <option value="">Select type</option>
                    <option value="date">Specific Date</option>
                    <option value="time">Specific Time</option>
                    <option value="dayOfWeek">Day of Week</option>
                  </select>
                </div>

                {scheduleData.scheduleType === "date" && (
                  <>
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={scheduleData.scheduledDate}
                        onChange={(e) =>
                          setScheduleData({
                            ...scheduleData,
                            scheduledDate: e.target.value,
                          })
                        }
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="form-group">
                      <label>Time (optional)</label>
                      <input
                        type="time"
                        value={scheduleData.scheduledTime}
                        onChange={(e) =>
                          setScheduleData({
                            ...scheduleData,
                            scheduledTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {scheduleData.scheduleType === "time" && (
                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      value={scheduleData.scheduledTime}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          scheduledTime: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {scheduleData.scheduleType === "dayOfWeek" && (
                  <div className="form-group">
                    <label>Day of Week</label>
                    <select
                      value={scheduleData.dayOfWeek}
                      onChange={(e) =>
                        setScheduleData({
                          ...scheduleData,
                          dayOfWeek: e.target.value,
                        })
                      }
                    >
                      <option value="">Select day</option>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="send-btn">
              {showSchedule && scheduleData.scheduleType ? "Schedule" : "Send"}
            </button>
          </form>
        </div>
      )}

      <button className="compose-btn" onClick={() => setShowCompose(true)}>
        <MdAdd /> Compose
      </button>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}

export default EmailUi;
