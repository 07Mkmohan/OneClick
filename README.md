# 🚀 OneClick – Email Management & Analytics Platform

OneClick is a **full-stack email management platform** built using the **MERN stack (MongoDB, Express, React, Node.js)**.  
It enables users to **send, schedule, track, and analyze emails at scale**, making it suitable for SaaS notifications, marketing tools, and enterprise communication systems.

---

## 📌 Problem Statement

Sending emails reliably at scale involves challenges such as:

- Poor email deliverability
- Bulk email management
- Scheduling complexity
- User engagement tracking
- Security & compliance concerns (GDPR, consent)

**OneClick solves these problems** by providing a centralized, analytics-driven email platform with real-time tracking and scheduling.

---

## ✨ Features

### 📧 Email Management

- Send single & bulk emails
- CSV upload for bulk recipients
- Draft, Sent, Scheduled folders
- Email categorization (Primary, Social, Promotions)

### ⏰ Scheduling

- Schedule emails for future delivery
- Background execution using cron jobs
- Real-time status updates

### 📊 Analytics & Tracking

- Email open tracking (tracking pixel)
- Click tracking (redirect-based)
- Real-time analytics via Socket.IO
- Dashboard with open & click rates

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
MongoDB (Users, Emails, Analytics)
↓
Email Service (SMTP / API-based)
↓
Tracking & Analytics Engine

markdown
Copy code

- **Socket.IO** handles real-time analytics updates
- **node-cron** manages scheduled emails
- **Tracking pixels & redirect links** capture user engagement

---

## 🛠 Tech Stack

### Frontend

- React
- React Router DOM
- Axios
- Socket.IO Client
- React Toastify
- PapaParse (CSV parsing)

### Backend

- Node.js
- Express.js
- MongoDB & Mongoose
- JWT Authentication
- bcryptjs
- Nodemailer
- node-cron
- Multer
- csv-parser
- Socket.IO

---

## 📂 Project Structure

OneClick/
├── client/ # React frontend
├── server/ # Express backend
│ ├── controllers/
│ ├── routes/
│ ├── models/
│ ├── cron/
│ └── utils/
├── README.md

yaml
Copy code

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- SMTP / Email service credentials

---

### 🔧 Backend Setup

```bash
cd server
npm install
Create a .env file inside server/:

env
Copy code
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret

EMAIL_SERVICE=Gmail
EMAIL_USER=your_email
EMAIL_PASS=your_password
Start the server:

bash
Copy code
npm start
🎨 Frontend Setup
bash
Copy code
cd client
npm install --legacy-peer-deps
npm run dev
📡 API Overview
Authentication
http
Copy code
POST /api/auth/register
POST /api/auth/login
Email
http
Copy code
POST /api/email/send
POST /api/email/schedule
GET  /api/email/analytics
Tracking
http
Copy code
GET /track/open/:id
GET /track/click/:id
🔐 Security & Compliance
JWT authentication & route protection

Encrypted passwords using bcrypt

Environment variable–based secrets

User consent–ready architecture

Optional tracking disable support

Planned unsubscribe & data deletion features

🚧 Limitations & Planned Improvements
Current Limitations
SMTP-based email delivery (may affect deliverability)

Basic analytics visualization

No unsubscribe automation yet

Planned Enhancements
Integration with SendGrid / AWS SES

Rate-limited bulk sending

GDPR consent & unsubscribe management

Role-based access control (RBAC)

Advanced analytics dashboard

Dark mode UI

Email template editor

Docker & CI/CD support

🗺 Roadmap
 Production email provider integration

 GDPR & consent compliance

 Advanced analytics dashboard

 CI/CD pipeline

 Docker support

📸 Screenshots
(Add screenshots here to improve adoption and visibility)

🤝 Contributing
Contributions are welcome!

Fork the repository

Create a feature branch

Submit a pull request

📜 License
This project is licensed under the MIT License.

👨‍💻 Author
Mohan
GitHub: https://github.com/07Mkmohan

⭐ Support
If you like this project, please star the repository ⭐
It helps improve visibility and encourages further development.

yaml
Copy code

---

## ✅ What This Gives You

✔ Solves **documentation limitation**
✔ Improves **project credibility & adoption**
✔ Shows **security & compliance awareness**
✔ Recruiter-ready & interview-ready
✔ Production-grade presentation

---

### 🔥 Next Recommended Step
Reply **`2`** → I’ll give you a **clear system flow explanation** (email send, tracking, scheduling) that you can **use directly in interviews**.

You’re building a **real-world level project now** 💪
```
