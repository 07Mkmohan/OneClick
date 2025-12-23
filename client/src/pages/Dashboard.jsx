import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import EmailUi from "../components/EMailUi";
import "./Dashboard.css";

const initialSearchResults = { sent: [], scheduled: [], recipients: [] };

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [sentEmails, setSentEmails] = useState([]);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [repliedEmails, setRepliedEmails] = useState([]);
  const [uniqueRecipients, setUniqueRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [recipientEmails, setRecipientEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(initialSearchResults);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const selectedRecipientRef = useRef(null);
  const sentEmailsRef = useRef([]);
  const hasSearchResults =
    searchResults.sent.length > 0 ||
    searchResults.scheduled.length > 0 ||
    searchResults.recipients.length > 0;

  useEffect(() => {
    selectedRecipientRef.current = selectedRecipient;
  }, [selectedRecipient]);

  useEffect(() => {
    sentEmailsRef.current = sentEmails;
  }, [sentEmails]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetchDashboardData();

    // CLICK OUTSIDE DROPDOWN
    const handleClickOutside = (e) => {
      if (!e.target.closest(".profile-dropdown-container")) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // ✅ SOCKET.IO — MOVED ABOVE RETURN (FIX)
    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("Dashboard socket connected");
    });

    socket.on("email-opened", (data) => {
      console.log("Email opened in real-time:", data);

      setSentEmails((prev) =>
        prev.map((email) =>
          email._id === data.emailId
            ? {
                ...email,
                openedCount: data.uniqueOpens || data.openedCount,
                totalOpens: data.opens,
                hasOpened: true,
              }
            : email
        )
      );

      const currentRecipient = selectedRecipientRef.current;
      if (currentRecipient) {
        setRecipientEmails((prev) =>
          prev.map((email) =>
            email._id === data.emailId
              ? {
                  ...email,
                  openedCount: data.uniqueOpens || data.openedCount,
                  totalOpens: data.opens,
                  hasOpened: true,
                }
              : email
          )
        );
      }

      fetchDashboardData();
    });

    socket.on("email-clicked", (data) => {
      console.log("Email clicked:", data);

      setSentEmails((prev) =>
        prev.map((email) =>
          email._id === data.emailId
            ? {
                ...email,
                totalClicks: data.totalClicks,
                clickedCount: data.clickedCount ?? email.clickedCount,
              }
            : email
        )
      );

      const currentRecipient = selectedRecipientRef.current;
      if (currentRecipient) {
        setRecipientEmails((prev) =>
          prev.map((email) =>
            email._id === data.emailId
              ? {
                  ...email,
                  totalClicks: data.totalClicks,
                  clickedCount: data.clickedCount ?? email.clickedCount,
                }
              : email
          )
        );
      }
    });

    socket.on("email-replied", (data) => {
      console.log("Email replied:", data);

      setSentEmails((prev) =>
        prev.map((email) =>
          email._id === data.originalEmailId
            ? {
                ...email,
                replied: true,
                replyFrom: data.replyFrom || email.replyFrom,
                replyTime: data.replyTime || email.replyTime,
              }
            : email
        )
      );

      const currentRecipient = selectedRecipientRef.current;
      if (currentRecipient) {
        setRecipientEmails((prev) =>
          prev.map((email) =>
            email._id === data.originalEmailId
              ? {
                  ...email,
                  replied: true,
                  replyFrom: data.replyFrom || email.replyFrom,
                  replyTime: data.replyTime || email.replyTime,
                }
              : email
          )
        );
      }

      const parentEmail = sentEmailsRef.current.find(
        (email) => email._id === data.originalEmailId
      );

      if (parentEmail) {
        const replyEntry = {
          _id: data.originalEmailId,
          to: parentEmail.to,
          from: parentEmail.from,
          subject: parentEmail.subject || data.replySubject,
          time: parentEmail.time,
          replyFrom: data.replyFrom || parentEmail.to,
          replyTime: data.replyTime || new Date().toISOString(),
          replyBody: data.replySnippet || parentEmail.replyBody,
          recipientCount: parentEmail.recipientCount || 1,
          openedCount: parentEmail.openedCount || 0,
          clickedCount: parentEmail.clickedCount || 0,
          totalOpens: parentEmail.totalOpens || 0,
          totalClicks: parentEmail.totalClicks || 0,
        };

        setRepliedEmails((prev) => [
          replyEntry,
          ...prev.filter((email) => email._id !== data.originalEmailId),
        ]);
      }

      fetchDashboardData();
    });

    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 5000);

    // ✅ CLEANUP
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(refreshInterval);
      socket.disconnect();
    };
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, sentRes, scheduledRes, repliedRes, uniqueRes] =
        await Promise.all([
          axios.get("http://localhost:5000/api/dashboard/stats", { headers }),
          axios.get("http://localhost:5000/api/dashboard/sent-emails", {
            headers,
          }),
          axios.get("http://localhost:5000/api/dashboard/scheduled", {
            headers,
          }),
          axios.get("http://localhost:5000/api/dashboard/replied", { headers }),
          axios.get("http://localhost:5000/api/dashboard/unique-recipients", {
            headers,
          }),
        ]);

      setStats(statsRes.data);
      setSentEmails(sentRes.data);
      setScheduledEmails(scheduledRes.data);
      setRepliedEmails(repliedRes.data);
      setUniqueRecipients(uniqueRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const profileInitials = `${user.firstName?.[0]?.toUpperCase() || ""}${
    user.lastName?.[0]?.toUpperCase() || ""
  }`;

  const handleRecipientClick = async (recipientEmail) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `http://localhost:5000/api/dashboard/recipient-emails/${encodeURIComponent(
          recipientEmail
        )}`,
        { headers }
      );
      setSelectedRecipient(recipientEmail);
      setRecipientEmails(res.data);
      setActiveTab("recipients");
    } catch (err) {
      console.error("Failed to fetch recipient emails:", err);
      toast.error("Failed to load recipient emails");
    }
  };

  const handleDeleteSentEmail = async (emailId) => {
    const confirmDelete = window.confirm(
      "Delete this email from Sent? It will move to Trash."
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `http://localhost:5000/api/emails/delete/${emailId}`,
        {},
        { headers }
      );

      setSentEmails((prev) => prev.filter((email) => email._id !== emailId));
      setRecipientEmails((prev) =>
        prev.filter((email) => email._id !== emailId)
      );
      setSearchResults((prev) => ({
        ...prev,
        sent: prev.sent.filter((email) => email._id !== emailId),
      }));

      toast.success("Email moved to Trash");
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to delete email:", err);
      toast.error("Failed to delete email");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(initialSearchResults);
      setActiveTab("overview");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `http://localhost:5000/api/dashboard/search?q=${encodeURIComponent(
          searchQuery
        )}`,
        { headers }
      );
      const data = res.data || initialSearchResults;
      setSearchResults({
        sent: data.sent || [],
        scheduled: data.scheduled || [],
        recipients: data.recipients || [],
      });
      setActiveTab("search");
    } catch (err) {
      console.error("Search failed:", err);
      toast.error("Search failed");
    }
  };

  if (loading) return <div className="dashboard-loading">Loading...</div>;

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-content">
          <h2>EmailSystem Dashboard</h2>
          <div className="nav-actions">
            <div className="profile-dropdown-container">
              <div
                className="profile-icon"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                {profileInitials || "U"}
              </div>

              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      navigate("/profile");
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* TABS -------------------------------------------------- */}
      <div className="dashboard-tabs">
        <div className="tabs-left">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => {
              setActiveTab("overview");
              setSelectedRecipient(null);
              setSearchResults(initialSearchResults);
            }}
          >
            Overview
          </button>

          <button
            className={activeTab === "recipients" ? "active" : ""}
            onClick={() => {
              setActiveTab("recipients");
              setSelectedRecipient(null);
              setSearchResults(initialSearchResults);
            }}
          >
            Unique Recipients
          </button>

          <button
            className={activeTab === "emails" ? "active" : ""}
            onClick={() => {
              setActiveTab("emails");
              setSelectedRecipient(null);
              setSearchResults(initialSearchResults);
            }}
          >
            Email Management
          </button>
        </div>

        <div className="tabs-right">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="dashboard-search"
            />
            <button className="search-btn" onClick={handleSearch}>
              🔍
            </button>
          </div>

          <button className="refresh-btn" onClick={fetchDashboardData}>
            🔄 Refresh
          </button>

          {lastRefresh && (
            <span className="last-refresh">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="dashboard-content">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Emails</h3>
              <p className="stat-value">{stats?.totalEmails || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Sent Emails</h3>
              <p className="stat-value">{stats?.sentEmails || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Scheduled</h3>
              <p className="stat-value">{stats?.scheduledEmails || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Total Opens</h3>
              <p className="stat-value">{stats?.totalOpens || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Total Clicks</h3>
              <p className="stat-value">{stats?.totalClicks || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Open Rate</h3>
              <p className="stat-value">{stats?.openRate?.toFixed(1) || 0}%</p>
            </div>
            <div className="stat-card">
              <h3>Click Rate</h3>
              <p className="stat-value">{stats?.clickRate?.toFixed(1) || 0}%</p>
            </div>
            <div className="stat-card">
              <h3>Total Recipients</h3>
              <p className="stat-value">{stats?.totalRecipients || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Unique Recipients</h3>
              <p className="stat-value">
                {uniqueRecipients.length || stats?.uniqueRecipientsCount || 0}
              </p>
            </div>
          </div>

          {/* Sent Emails Table */}
          <div className="dashboard-section">
            <h3>Recent Sent Emails</h3>
            <div className="table-container">
              <table className="emails-table">
                <thead>
                  <tr>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Sent</th>
                    <th>Recipients</th>
                    <th>Opened</th>
                    <th>Clicks</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sentEmails.slice(0, 10).map((email) => (
                    <tr key={email._id}>
                      <td>{email.to}</td>
                      <td>{email.subject}</td>
                      <td>{new Date(email.time).toLocaleDateString()}</td>
                      <td>{email.recipientCount || 1}</td>
                      <td>
                        <span
                          className={
                            email.hasOpened || email.openedCount > 0
                              ? "status-opened"
                              : ""
                          }
                        >
                          {(email.hasOpened || email.openedCount > 0) && (
                            <span
                              className="green-tick"
                              title={`Email opened by ${
                                email.openedCount || email.totalOpens || 0
                              } recipient(s)`}
                            >
                              ✓
                            </span>
                          )}
                          <span
                            style={{
                              marginLeft:
                                email.hasOpened || email.openedCount > 0
                                  ? "5px"
                                  : "0",
                            }}
                          >
                            {email.openedCount || 0} /{" "}
                            {email.recipientCount || 1}
                          </span>
                          {email.totalOpens > 0 &&
                            email.totalOpens !== (email.openedCount || 0) && (
                              <span
                                className="total-opens"
                                title="Total opens tracked"
                              >
                                {" "}
                                ({email.totalOpens})
                              </span>
                            )}
                        </span>
                      </td>
                      <td>{email.clickedCount || 0}</td>
                      <td>
                        <span className={`status-badge ${email.status}`}>
                          {email.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-action-btn delete"
                          onClick={() => handleDeleteSentEmail(email._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sentEmails.length === 0 && (
                <p className="no-data">No sent emails yet</p>
              )}
            </div>
          </div>

          {/* Scheduled Emails */}
          <div className="dashboard-section">
            <h3>Scheduled Emails</h3>
            <div className="table-container">
              <table className="emails-table">
                <thead>
                  <tr>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Recipients</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledEmails.map((email) => (
                    <tr key={email._id}>
                      <td>{email.to}</td>
                      <td>{email.subject}</td>
                      <td>
                        <strong className="schedule-day">
                          {email.scheduleDisplay?.day || "N/A"}
                        </strong>
                      </td>
                      <td className="schedule-date">
                        {email.scheduleDisplay?.date || "N/A"}
                      </td>
                      <td>
                        <strong className="schedule-time">
                          {email.scheduleDisplay?.time || "N/A"}
                        </strong>
                      </td>
                      <td>
                        <span className="schedule-type-badge">
                          {email.scheduleDisplay?.type ||
                            email.scheduledType ||
                            "N/A"}
                        </span>
                      </td>
                      <td>{email.recipients?.length || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {scheduledEmails.length === 0 && (
                <p className="no-data">No scheduled emails</p>
              )}
            </div>
          </div>

          {/* Replied Emails */}
          <div className="dashboard-section">
            <h3>Replied Emails</h3>
            <div className="table-container">
              <table className="emails-table">
                <thead>
                  <tr>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Sent</th>
                    <th>Replied By</th>
                    <th>Reply Time</th>
                    <th>Opened</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {repliedEmails.map((email) => (
                    <tr key={email._id} className="replied-row">
                      <td>{email.to}</td>
                      <td>
                        <strong>{email.subject}</strong>
                        <span
                          className="replied-badge"
                          title="This email has been replied to"
                        >
                          💬
                        </span>
                      </td>
                      <td>{new Date(email.time).toLocaleDateString()}</td>
                      <td>
                        <strong className="reply-from">
                          {email.replyFrom}
                        </strong>
                      </td>
                      <td>{new Date(email.replyTime).toLocaleString()}</td>
                      <td>
                        <span
                          className={
                            email.openedCount > 0 ? "status-opened" : ""
                          }
                        >
                          {email.openedCount > 0 && (
                            <span
                              className="green-tick"
                              title="Email opened by recipient"
                            >
                              ✓
                            </span>
                          )}
                          <span
                            style={{
                              marginLeft: email.openedCount > 0 ? "5px" : "0",
                            }}
                          >
                            {email.openedCount || 0} /{" "}
                            {email.recipientCount || 1}
                          </span>
                        </span>
                      </td>
                      <td>{email.clickedCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {repliedEmails.length === 0 && (
                <p className="no-data">No replied emails yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "recipients" && (
        <div className="dashboard-content">
          {selectedRecipient ? (
            <div>
              <div className="recipient-header">
                <button
                  className="back-btn"
                  onClick={() => {
                    setSelectedRecipient(null);
                    setRecipientEmails([]);
                  }}
                >
                  ← Back to Recipients
                </button>
                <h3>Emails sent to: {selectedRecipient}</h3>
              </div>
              <div className="table-container">
                <table className="emails-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Sent</th>
                      <th>Opened</th>
                      <th>Clicks</th>
                      <th>Replied</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientEmails.map((email) => (
                      <tr key={email._id}>
                        <td>{email.subject}</td>
                        <td>{new Date(email.time).toLocaleDateString()}</td>
                        <td>
                          <span
                            className={
                              email.hasOpened || email.openedCount > 0
                                ? "status-opened"
                                : ""
                            }
                          >
                            {(email.hasOpened || email.openedCount > 0) && (
                              <span className="green-tick">✓</span>
                            )}
                            <span
                              style={{
                                marginLeft:
                                  email.hasOpened || email.openedCount > 0
                                    ? "5px"
                                    : "0",
                              }}
                            >
                              {email.openedCount || 0}
                            </span>
                          </span>
                        </td>
                        <td>{email.clickedCount || 0}</td>
                        <td>
                          {email.replied ? (
                            <span
                              className="replied-badge"
                              title={`Replied by ${email.replyFrom}`}
                            >
                              💬{" "}
                              {new Date(email.replyTime).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="no-reply">No reply</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${email.status}`}>
                            {email.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recipientEmails.length === 0 && (
                  <p className="no-data">No emails found for this recipient</p>
                )}
              </div>
            </div>
          ) : (
            <div className="dashboard-section">
              <h3>Unique Recipients ({uniqueRecipients.length})</h3>
              <p className="section-description">
                Each recipient is counted only once, regardless of how many
                emails you send to them.
              </p>
              <div className="table-container">
                <table className="emails-table">
                  <thead>
                    <tr>
                      <th>Recipient Email</th>
                      <th>Total Emails</th>
                      <th>First Email</th>
                      <th>Last Email</th>
                      <th>Total Opens</th>
                      <th>Total Clicks</th>
                      <th>Replied</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueRecipients.map((recipient) => (
                      <tr key={recipient._id}>
                        <td>
                          <strong>{recipient.recipientEmail}</strong>
                        </td>
                        <td>{recipient.totalEmailsSent}</td>
                        <td>
                          {new Date(
                            recipient.firstEmailTime
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {new Date(
                            recipient.lastEmailTime
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {recipient.totalOpens > 0 && (
                            <span className="green-tick">✓</span>
                          )}
                          {recipient.totalOpens || 0}
                        </td>
                        <td>{recipient.totalClicks || 0}</td>
                        <td>
                          {recipient.hasReplied ? (
                            <span className="replied-badge">
                              💬{" "}
                              {recipient.lastReplyTime
                                ? new Date(
                                    recipient.lastReplyTime
                                  ).toLocaleDateString()
                                : "Yes"}
                            </span>
                          ) : (
                            <span className="no-reply">No</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="view-emails-btn"
                            onClick={() =>
                              handleRecipientClick(recipient.recipientEmail)
                            }
                          >
                            View Emails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uniqueRecipients.length === 0 && (
                  <p className="no-data">No recipients yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="dashboard-content">
          <div className="dashboard-section">
            <h3>Search Results for: "{searchQuery}"</h3>

            {!hasSearchResults && searchQuery && (
              <p className="no-data">No results found</p>
            )}

            {searchResults.sent.length > 0 && (
              <>
                <h4>Sent Emails</h4>
                <div className="table-container">
                  <table className="emails-table">
                    <thead>
                      <tr>
                        <th>To</th>
                        <th>Subject</th>
                        <th>Sent</th>
                        <th>Opened</th>
                        <th>Clicks</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.sent.map((email) => (
                        <tr key={email._id}>
                          <td>{email.to}</td>
                          <td>{email.subject}</td>
                          <td>{new Date(email.time).toLocaleDateString()}</td>
                          <td>
                            <span
                              className={
                                email.hasOpened || email.openedCount > 0
                                  ? "status-opened"
                                  : ""
                              }
                            >
                              {(email.hasOpened || email.openedCount > 0) && (
                                <span className="green-tick">✓</span>
                              )}
                              <span
                                style={{
                                  marginLeft:
                                    email.hasOpened || email.openedCount > 0
                                      ? "5px"
                                      : "0",
                                }}
                              >
                                {email.openedCount || 0}
                              </span>
                            </span>
                          </td>
                          <td>{email.clickedCount || 0}</td>
                          <td>
                            <span className={`status-badge ${email.status}`}>
                              {email.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="table-action-btn delete"
                              onClick={() => handleDeleteSentEmail(email._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {searchResults.scheduled.length > 0 && (
              <>
                <h4>Scheduled Emails</h4>
                <div className="table-container">
                  <table className="emails-table">
                    <thead>
                      <tr>
                        <th>To</th>
                        <th>Subject</th>
                        <th>Day</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.scheduled.map((email) => (
                        <tr key={email._id}>
                          <td>{email.to}</td>
                          <td>{email.subject}</td>
                          <td>{email.scheduleDisplay?.day || "N/A"}</td>
                          <td>{email.scheduleDisplay?.date || "N/A"}</td>
                          <td>{email.scheduleDisplay?.time || "N/A"}</td>
                          <td>
                            <span className="schedule-badge">
                              {email.scheduleDisplay?.type || "scheduled"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {searchResults.recipients.length > 0 && (
              <>
                <h4>Recipient Matches</h4>
                <div className="table-container">
                  <table className="emails-table">
                    <thead>
                      <tr>
                        <th>Name / Email</th>
                        <th>Total Emails</th>
                        <th>Opens</th>
                        <th>Clicks</th>
                        <th>Replied</th>
                        <th>Last Email</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.recipients.map((recipient) => (
                        <tr key={recipient._id}>
                          <td>
                            <div className="recipient-cell">
                              <strong>
                                {recipient.displayName ||
                                  recipient.recipientEmail}
                              </strong>
                              <div className="muted">
                                {recipient.recipientEmail}
                              </div>
                            </div>
                          </td>
                          <td>{recipient.totalEmailsSent}</td>
                          <td>{recipient.totalOpens}</td>
                          <td>{recipient.totalClicks}</td>
                          <td>
                            {recipient.hasReplied ? (
                              <span className="replied-badge">Yes</span>
                            ) : (
                              <span className="no-reply">No</span>
                            )}
                          </td>
                          <td>
                            {recipient.lastEmailTime
                              ? new Date(
                                  recipient.lastEmailTime
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td>
                            <button
                              className="view-emails-btn"
                              onClick={() =>
                                handleRecipientClick(recipient.recipientEmail)
                              }
                            >
                              View Emails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "emails" && (
        <div className="dashboard-content">
          <EmailUi />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
