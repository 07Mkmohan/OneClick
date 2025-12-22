import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, analyticsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/admin/users", { headers }),
        axios.get("http://localhost:5000/api/admin/analytics", { headers }),
      ]);

      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        toast.error("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user._id);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
    });
  };

  const handleUpdate = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `http://localhost:5000/api/admin/users/${userId}`,
        editForm,
        { headers }
      );
      toast.success("User updated successfully");
      setEditingUser(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  const handleDelete = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This will also delete all their emails."
      )
    ) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers,
      });
      toast.success("User deleted successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <h2>Admin Dashboard</h2>
        <button onClick={handleLogout} className="admin-logout-btn">
          Logout
        </button>
      </nav>

      <div className="admin-content">
        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Total Users</h3>
            <p className="analytics-value">{analytics?.totalUsers || 0}</p>
          </div>
          <div className="analytics-card">
            <h3>Active Users (30 days)</h3>
            <p className="analytics-value">{analytics?.activeUsers || 0}</p>
          </div>
          <div className="analytics-card">
            <h3>Total Emails</h3>
            <p className="analytics-value">{analytics?.totalEmails || 0}</p>
          </div>
          <div className="analytics-card">
            <h3>Sent Emails</h3>
            <p className="analytics-value">{analytics?.sentEmails || 0}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="users-section">
          <h3>All Registered Users ({users.length})</h3>
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Date of Birth</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    {editingUser === user._id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                firstName: e.target.value,
                              })
                            }
                            className="edit-input"
                          />
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                lastName: e.target.value,
                              })
                            }
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                            }
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editForm.mobileNumber}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                mobileNumber: e.target.value,
                              })
                            }
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={editForm.dateOfBirth}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                dateOfBirth: e.target.value,
                              })
                            }
                            className="edit-input"
                          />
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="save-btn"
                            onClick={() => handleUpdate(user._id)}
                          >
                            Save
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {user.firstName} {user.lastName}
                        </td>
                        <td>{user.email}</td>
                        <td>{user.mobileNumber}</td>
                        <td>
                          {user.dateOfBirth
                            ? new Date(user.dateOfBirth).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-btn1"
                            onClick={() => handleDelete(user._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
