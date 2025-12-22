# EmailSystem - MERN Stack Email Management Platform

A comprehensive email management system built with the MERN stack (MongoDB, Express, React, Node.js) featuring bulk email sending, tracking, scheduling, and analytics.

## Features

### 🏠 Landing Page
- Responsive navbar with Home, About, Features, and Get Started button
- Hero section with call-to-action
- Feature overview section
- About section
- Footer

### 🔐 Authentication System
- **Register Page**: Full registration with validation for:
  - First Name
  - Last Name
  - Date of Birth
  - Mobile Number
  - Email
  - Password & Confirm Password
- **Login Page**: Secure user authentication
- **Forgot Password Flow**: Secure password reset with email links
- **Reset Password**: Token-based password reset

### 📧 Email Management
- Send single or bulk emails
- Email folders (Inbox, Sent, Drafts, Trash)
- Reply to emails
- Delete and restore emails
- Email categorization (Primary, Social, Promotions)

### 📊 CSV Upload & Bulk Email
- Upload CSV files with email addresses
- Email validation and preview
- Preview valid/invalid emails before sending
- Send bulk emails to all validated recipients

### 📈 Email Tracking
- **Open Tracking**: Hidden tracking pixel that records when emails are opened
- **Link Click Tracking**: Automatic URL rewriting to track link clicks
- **Recipient-Level Tracking**: Track opens and clicks per recipient
- **Dashboard Analytics**: View open rates, click rates, and engagement metrics

### ⏰ Email Scheduling
- Schedule emails by specific date
- Schedule emails by specific time
- Schedule emails by day of week (recurring)
- Automatic sending via cron jobs

### 📊 Dashboard
- Statistics overview (total emails, sent, scheduled, opens, clicks)
- Open rate and click rate metrics
- Recent sent emails with tracking status
- Scheduled emails list
- Green tick indicators for opened emails
- Link click counts per email

## Tech Stack

### Backend
- Node.js & Express
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Nodemailer for email sending
- node-cron for scheduling
- Socket.IO for real-time updates
- Multer for file uploads
- csv-parser for CSV processing

### Frontend
- React 19
- React Router DOM
- Axios for API calls
- React Toastify for notifications
- Socket.IO Client for real-time updates
- PapaParse for CSV parsing

## Project Structure

```
EmailSyatem/
├── server/
│   ├── models/
│   │   ├── User.js          # User model with authentication
│   │   └── Email.js          # Email model with tracking
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── emails.js         # Email CRUD operations
│   │   ├── tracking.js        # Email tracking routes
│   │   ├── csv.js            # CSV upload and bulk sending
│   │   ├── scheduling.js     # Email scheduling
│   │   └── dashboard.js     # Dashboard statistics
│   ├── services/
│   │   └── scheduler.js      # Cron job scheduler
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   └── server.js             # Main server file
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── components/
│   │   │   └── EMailUi.jsx   # Email management UI
│   │   └── utils/
│   │       └── api.js        # API utility with auth
│   └── package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Email account for sending emails (Gmail, etc.)

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory:
```env
MONGO_URI=mongodb://127.0.0.1:27017/emailApp
PORT=5000
JWT_SECRET=your-secret-key-here
EMAIL_SERVICE=Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
APP_URL=http://localhost:3000
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

4. Start the server:
```bash
npm start
# or with nodemon for development
nodemon server.js
```

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Emails
- `GET /api/emails/:folder` - Get emails by folder (protected)
- `POST /api/emails` - Send email (protected)
- `POST /api/emails/reply/:id` - Reply to email (protected)
- `PUT /api/emails/delete/:id` - Delete email (protected)
- `PUT /api/emails/restore/:id` - Restore email (protected)
- `DELETE /api/emails/trash/:id` - Permanently delete (protected)

### Tracking
- `GET /api/track/open/:id` - Track email open (public, returns pixel)
- `GET /api/track/click/:id` - Track link click (public, redirects)

### CSV
- `POST /api/csv/upload` - Upload and validate CSV (protected)
- `POST /api/csv/send-bulk` - Send bulk emails from CSV (protected)

### Scheduling
- `POST /api/schedule/schedule` - Schedule email (protected)
- `GET /api/schedule/scheduled` - Get scheduled emails (protected)
- `DELETE /api/schedule/cancel/:id` - Cancel scheduled email (protected)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics (protected)
- `GET /api/dashboard/sent-emails` - Get sent emails with tracking (protected)
- `GET /api/dashboard/scheduled` - Get scheduled emails (protected)

## Usage

1. **Register/Login**: Start by creating an account or logging in
2. **Compose Email**: Click "Compose" to send emails
3. **Upload CSV**: Upload a CSV file with email addresses for bulk sending
4. **Schedule Emails**: Enable scheduling and set date/time/day of week
5. **View Dashboard**: Check statistics, open rates, and click rates
6. **Track Emails**: View which recipients opened emails (green ticks) and clicked links

## CSV Format

The CSV file should have an "email" column (case-insensitive):
```csv
email
user1@example.com
user2@example.com
user3@example.com
```

## Email Tracking

- **Open Tracking**: A 1x1 transparent pixel is embedded in each email
- **Click Tracking**: All URLs in emails are automatically rewritten to tracking links
- **Dashboard**: View real-time statistics on opens and clicks

## Scheduling

Emails can be scheduled for:
- **Specific Date**: Choose a date (and optional time)
- **Specific Time**: Choose a time (sends today or tomorrow)
- **Day of Week**: Recurring emails on specific days

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Secure password reset tokens
- Protected API routes
- Input validation

## License

ISC

## Author

EmailSystem Development Team


