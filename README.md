# 🚀 OneClick – Email Management & Analytics Platform

OneClick is a **full-stack email management platform** built using the **MERN stack (MongoDB, Express, React, Node.js)**.  
It enables users to **send, schedule, track, and analyze emails**, suitable for SaaS notifications and bulk communication systems.

---

## 📌 Problem Statement

Sending emails at scale involves challenges such as:

- Bulk email management
- Scheduling complexity
- User engagement tracking
- Security and consent concerns

**OneClick addresses these challenges** by providing a centralized email platform with scheduling and analytics.

---

## ✨ Features

### 📧 Email Management

- Send single and bulk emails
- CSV upload for bulk recipients
- Draft, Sent, and Scheduled folders

### ⏰ Scheduling

- Schedule emails for future delivery
- Background execution using cron jobs

### 📊 Analytics & Tracking

- Email open tracking (tracking pixel)
- Click tracking (redirect-based)
- Analytics dashboard with open and click rates

### 🔐 Authentication & Security

- JWT-based authentication
- Password hashing using bcrypt
- Protected API routes

---

## 🧠 System Architecture

Frontend (React)  
↓  
Backend API (Node.js + Express)  
↓  
MongoDB  
↓  
Email Service (SMTP)  
↓  
Tracking & Analytics Engine

- Socket.IO for real-time updates
- node-cron for scheduled emails

---

## 🛠 Tech Stack

### Frontend

- React
- React Router DOM
- Axios
- Socket.IO Client
- React Toastify
- PapaParse

### Backend

- Node.js
- Express.js
- MongoDB & Mongoose
- JWT
- bcryptjs
- Nodemailer
- node-cron
- Multer
- csv-parser
- Socket.IO

---

## 📂 Project Structure

OneClick/
├── client/
├── server/
│ ├── controllers/
│ ├── routes/
│ ├── models/
│ ├── cron/
│ └── utils/
├── README.md

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v18+)
- MongoDB
- SMTP email credentials

---

### 🔧 Backend Setup

```bash
cd server
npm install

Create a .env file inside server/:

PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret

EMAIL_SERVICE=Gmail
EMAIL_USER=your_email
EMAIL_PASS=your_password


Frontend Setup

cd client
npm install --legacy-peer-deps
npm run dev


🚧 Limitations

SMTP-based email delivery

Basic analytics

No unsubscribe automation


📜 License

This project is licensed under the MIT License.

👨‍💻 Author

Mohan
GitHub: https://github.com/07Mkmohan
```
