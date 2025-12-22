# OneClick - MERN Stack Email Management Platform

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

## Author

fullstack-Developer : Mohan
